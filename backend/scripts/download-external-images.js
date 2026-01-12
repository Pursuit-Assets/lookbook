#!/usr/bin/env node
/**
 * Download External Images Script
 *
 * Downloads images from external URLs (LinkedIn, etc.) and stores them locally.
 * This fixes issues with CORS, hotlink protection, and expired URLs.
 *
 * Usage: node scripts/download-external-images.js [--dry-run]
 */

const { pool } = require('../db/dbConfig');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

const DRY_RUN = process.argv.includes('--dry-run');

// Directories for uploads
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

/**
 * Download an image from a URL and save it locally
 */
function downloadImage(url, directory, prefix = '') {
  return new Promise((resolve, reject) => {
    // Generate filename from URL hash
    const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 12);
    const extension = getExtensionFromUrl(url) || 'jpg';
    const filename = `${prefix}${hash}.${extension}`;
    const filepath = path.join(UPLOAD_DIR, directory, filename);
    const localUrl = `/uploads/${directory}/${filename}`;

    // Check if file already exists
    if (fs.existsSync(filepath)) {
      resolve({ localUrl, alreadyExists: true });
      return;
    }

    // Create directory if needed
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Download the image
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/*,*/*',
        'Referer': 'https://www.linkedin.com/'
      },
      timeout: 30000
    }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadImage(response.headers.location, directory, prefix)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve({ localUrl, alreadyExists: false });
      });

      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete partial file
        reject(err);
      });
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Extract file extension from URL
 */
function getExtensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase().replace('.', '');
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return ext;
    }
  } catch (e) {}
  return 'jpg'; // Default to jpg
}

/**
 * Check if URL is external (not local)
 */
function isExternalUrl(url) {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

async function migrateExternalImages() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  External Image Download Script');
  console.log('═══════════════════════════════════════════════════════════════');

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Get profiles with external photo URLs (join with users to get name)
    const profilesResult = await pool.query(`
      SELECT p.id, p.slug, u.name, p.photo_url
      FROM lookbook_profiles p
      LEFT JOIN users u ON p.user_id = u.user_id
      WHERE p.photo_url IS NOT NULL
        AND p.photo_url != ''
        AND (p.photo_url LIKE 'http://%' OR p.photo_url LIKE 'https://%')
    `);

    console.log(`\nFound ${profilesResult.rows.length} profiles with external image URLs\n`);

    let downloaded = 0;
    let skipped = 0;
    let errors = 0;

    for (const profile of profilesResult.rows) {
      const { id, slug, name, photo_url } = profile;

      try {
        if (DRY_RUN) {
          console.log(`  Would download: ${name} (${slug})`);
          console.log(`    From: ${photo_url.substring(0, 60)}...`);
          downloaded++;
          continue;
        }

        const result = await downloadImage(photo_url, 'profiles', 'photo-');

        if (result.alreadyExists) {
          console.log(`  ⏭️  ${name}: Already downloaded`);
          skipped++;
        } else {
          console.log(`  ✓ ${name}: ${result.localUrl}`);

          // Update database
          await pool.query(
            'UPDATE lookbook_profiles SET photo_url = $1 WHERE id = $2',
            [result.localUrl, id]
          );
          downloaded++;
        }
      } catch (err) {
        console.log(`  ✗ ${name}: ${err.message}`);
        errors++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Complete!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Downloaded: ${downloaded}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);

    if (DRY_RUN) {
      console.log('\n⚠️  This was a dry run. Run without --dry-run to apply changes.');
    }

  } catch (err) {
    console.error('\n❌ Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateExternalImages();

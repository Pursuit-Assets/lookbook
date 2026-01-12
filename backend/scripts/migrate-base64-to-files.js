#!/usr/bin/env node
/**
 * Migration Script: Convert Base64 Images to Files
 *
 * This script converts all base64-encoded images in the database to files,
 * dramatically reducing API response sizes.
 *
 * Before: 8 projects = ~14MB API response
 * After:  8 projects = ~50KB API response
 *
 * Usage: node scripts/migrate-base64-to-files.js [--dry-run]
 */

const { pool } = require('../db/dbConfig');
const { base64ToFile, isBase64Image } = require('../utils/imageConverter');

const DRY_RUN = process.argv.includes('--dry-run');

// Image fields to migrate for each table
const MIGRATIONS = [
  {
    table: 'lookbook_projects',
    idField: 'id',
    nameField: 'slug',
    imageFields: [
      { column: 'main_image_url', directory: 'projects', prefix: 'main-' },
      { column: 'card_background_url', directory: 'projects', prefix: 'card-bg-' },
      { column: 'icon_url', directory: 'projects', prefix: 'icon-' },
      { column: 'partner_logo_url', directory: 'projects', prefix: 'partner-' },
    ]
  },
  {
    table: 'lookbook_profiles',
    idField: 'id',
    nameField: 'slug',
    imageFields: [
      { column: 'photo_url', directory: 'profiles', prefix: 'photo-' },
    ]
  }
];

async function getBase64Stats() {
  console.log('\n📊 Analyzing base64 images in database...\n');

  const stats = { total: 0, totalSize: 0, byTable: {} };

  for (const migration of MIGRATIONS) {
    const { table, imageFields, nameField } = migration;
    stats.byTable[table] = { count: 0, size: 0, fields: {} };

    // Build SELECT for all image fields
    const columns = imageFields.map(f => f.column).join(', ');
    const result = await pool.query(`SELECT ${nameField}, ${columns} FROM ${table}`);

    for (const row of result.rows) {
      for (const field of imageFields) {
        const value = row[field.column];
        if (value && isBase64Image(value)) {
          const size = value.length;
          stats.total++;
          stats.totalSize += size;
          stats.byTable[table].count++;
          stats.byTable[table].size += size;
          stats.byTable[table].fields[field.column] = (stats.byTable[table].fields[field.column] || 0) + 1;
        }
      }
    }
  }

  return stats;
}

async function migrateTable(migration) {
  const { table, idField, nameField, imageFields } = migration;

  console.log(`\n🔄 Migrating ${table}...`);

  // Get all rows with image columns
  const columns = [idField, nameField, ...imageFields.map(f => f.column)].join(', ');
  const result = await pool.query(`SELECT ${columns} FROM ${table}`);

  let converted = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of result.rows) {
    const updates = {};

    for (const field of imageFields) {
      const value = row[field.column];

      if (value && isBase64Image(value)) {
        try {
          // Convert base64 to file
          const fileUrl = base64ToFile(value, field.directory, field.prefix);

          if (fileUrl !== value) {
            updates[field.column] = fileUrl;
            console.log(`  ✓ ${row[nameField]}.${field.column}: ${(value.length / 1024).toFixed(0)}KB → ${fileUrl}`);
          }
        } catch (err) {
          console.error(`  ✗ ${row[nameField]}.${field.column}: ${err.message}`);
          errors++;
        }
      } else if (value && value.startsWith('/uploads/')) {
        skipped++;
      }
    }

    // Update database if we have changes
    if (Object.keys(updates).length > 0 && !DRY_RUN) {
      const setClauses = Object.keys(updates).map((col, i) => `${col} = $${i + 2}`);
      const values = [row[idField], ...Object.values(updates)];

      await pool.query(
        `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${idField} = $1`,
        values
      );
      converted += Object.keys(updates).length;
    } else if (Object.keys(updates).length > 0) {
      converted += Object.keys(updates).length;
    }
  }

  return { converted, skipped, errors };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Base64 to File Migration Script');
  console.log('═══════════════════════════════════════════════════════════════');

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made to the database\n');
  }

  try {
    // Get stats first
    const stats = await getBase64Stats();

    console.log('Current base64 image stats:');
    console.log(`  Total base64 images: ${stats.total}`);
    console.log(`  Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);

    for (const [table, tableStats] of Object.entries(stats.byTable)) {
      if (tableStats.count > 0) {
        console.log(`\n  ${table}:`);
        console.log(`    Images: ${tableStats.count}`);
        console.log(`    Size: ${(tableStats.size / 1024 / 1024).toFixed(2)} MB`);
        for (const [field, count] of Object.entries(tableStats.fields)) {
          console.log(`      - ${field}: ${count}`);
        }
      }
    }

    if (stats.total === 0) {
      console.log('\n✅ No base64 images found. Nothing to migrate!');
      await pool.end();
      return;
    }

    console.log('\n───────────────────────────────────────────────────────────────');
    console.log('Starting migration...');

    let totalConverted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const migration of MIGRATIONS) {
      const result = await migrateTable(migration);
      totalConverted += result.converted;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Migration Complete!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Converted: ${totalConverted}`);
    console.log(`  Skipped (already files): ${totalSkipped}`);
    console.log(`  Errors: ${totalErrors}`);

    if (DRY_RUN) {
      console.log('\n⚠️  This was a dry run. Run without --dry-run to apply changes.');
    } else {
      console.log('\n✅ Database updated! Images now served from /uploads/');
    }

  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

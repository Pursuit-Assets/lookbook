// Utility to convert base64 images to file URLs
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Converts a base64 string to a file and returns the URL
 * @param {string} base64String - The base64 encoded image (with or without data:image prefix)
 * @param {string} directory - Directory name (e.g., 'profiles' or 'projects')
 * @param {string} prefix - Optional filename prefix
 * @returns {string} - The file URL (e.g., '/uploads/profiles/abc123.jpg')
 */
function base64ToFile(base64String, directory, prefix = '') {
  if (!base64String || !base64String.includes('base64,')) {
    // Not a base64 string, return as-is
    return base64String;
  }

  try {
    // Extract the base64 data and mime type
    const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return base64String;
    }

    const extension = matches[1]; // jpg, png, etc.
    const data = matches[2];
    
    // Generate unique filename
    const hash = crypto.createHash('md5').update(data).digest('hex').substring(0, 12);
    const filename = `${prefix}${hash}.${extension}`;
    const filepath = path.join(__dirname, '..', 'public', 'uploads', directory, filename);
    
    // Create directory if it doesn't exist
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filepath, buffer);
    
    // Return URL path
    return `/uploads/${directory}/${filename}`;
  } catch (error) {
    console.error('Error converting base64 to file:', error);
    return base64String; // Return original on error
  }
}

/**
 * Checks if a string is a base64 encoded image
 * @param {string} str - String to check
 * @returns {boolean}
 */
function isBase64Image(str) {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('data:image/') && str.includes('base64,');
}

/**
 * Deletes an image file from the uploads directory
 * @param {string} imageUrl - The image URL (e.g., '/uploads/profiles/abc123.jpg')
 * @returns {boolean} - Success status
 */
function deleteImageFile(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
    return false;
  }

  try {
    const filepath = path.join(__dirname, '..', 'public', imageUrl);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
  } catch (error) {
    console.error('Error deleting image file:', error);
  }
  
  return false;
}

/**
 * Converts a base64 image to optimized WebP files using Sharp.
 * Generates a full-size and 400w version for srcset.
 * Falls back to base64ToFile if Sharp is unavailable.
 *
 * @param {string} base64String - base64 encoded image (data:image/... prefix)
 * @param {string} directory - 'profiles' or 'projects'
 * @param {string} prefix - filename prefix (e.g. slug)
 * @param {Object} options - { maxWidth, quality }
 * @returns {Promise<{ url: string, srcset: string }>}
 */
async function processBase64Image(base64String, directory, prefix = '', options = {}) {
  if (!base64String || !base64String.includes('base64,')) {
    return { url: base64String, srcset: '' };
  }

  const { maxWidth = 1200, quality = 82 } = options;

  // Extract raw buffer from base64
  const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) return { url: base64String, srcset: '' };

  const data = matches[2];
  const hash = crypto.createHash('md5').update(data).digest('hex').substring(0, 12);
  const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', directory);

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Try Sharp first for WebP conversion
  try {
    const sharp = require('sharp');
    const buffer = Buffer.from(data, 'base64');

    const fullFilename = `${prefix}${hash}.webp`;
    const fullPath = path.join(uploadsDir, fullFilename);
    const smallFilename = `${prefix}${hash}-400w.webp`;
    const smallPath = path.join(uploadsDir, smallFilename);

    // Generate full-size WebP
    await sharp(buffer)
      .resize(maxWidth, null, { withoutEnlargement: true, fit: 'inside' })
      .webp({ quality })
      .toFile(fullPath);

    // Generate 400w thumbnail
    await sharp(buffer)
      .resize(400, null, { withoutEnlargement: true, fit: 'inside' })
      .webp({ quality })
      .toFile(smallPath);

    const url = `/uploads/${directory}/${fullFilename}`;
    const smallUrl = `/uploads/${directory}/${smallFilename}`;
    const srcset = `${smallUrl} 400w, ${url} ${maxWidth}w`;

    return { url, srcset };
  } catch (err) {
    console.warn('Sharp not available, falling back to original format:', err.message);
    // Fall back to saving original format
    const fallbackUrl = base64ToFile(base64String, directory, prefix);
    return { url: fallbackUrl, srcset: '' };
  }
}

module.exports = {
  base64ToFile,
  isBase64Image,
  deleteImageFile,
  processBase64Image
};


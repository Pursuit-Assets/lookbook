/**
 * Image optimization utility
 * Generates multiple sizes and formats for responsive images
 * 
 * Requires: npm install sharp
 * Usage: After installing sharp, images can be optimized on upload
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate optimized image sizes
 * @param {string} imagePath - Path to source image
 * @param {string} outputDir - Directory to save optimized images
 * @param {Object} options - Optimization options
 * @returns {Promise<Object>} - Object with URLs for different sizes
 */
async function optimizeImage(imagePath, outputDir, options = {}) {
  const {
    widths = [400, 800, 1200],
    quality = 80,
    formats = ['webp', 'original']
  } = options;

  try {
    // Check if sharp is available
    let sharp;
    try {
      sharp = require('sharp');
    } catch (error) {
      console.warn('⚠️  Sharp not installed. Install with: npm install sharp');
      console.warn('   Image optimization will be skipped.');
      return null;
    }

    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image not found: ${imagePath}`);
    }

    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const baseName = path.basename(imagePath, path.extname(imagePath));
    const ext = path.extname(imagePath).slice(1); // Remove dot
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const optimizedImages = {};

    // Generate different sizes
    for (const width of widths) {
      // Skip if original is smaller than requested width
      if (metadata.width && metadata.width < width) {
        continue;
      }

      for (const format of formats) {
        const outputFilename = `${baseName}-${width}w.${format === 'original' ? ext : format}`;
        const outputPath = path.join(outputDir, outputFilename);
        
        let processedImage = image.clone().resize(width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        });

        if (format === 'webp') {
          processedImage = processedImage.webp({ quality });
        } else if (format === 'original') {
          processedImage = processedImage.jpeg({ quality }).png({ quality });
        }

        await processedImage.toFile(outputPath);
        
        const relativePath = path.relative(path.join(__dirname, '..', 'public'), outputPath);
        const url = `/${relativePath.replace(/\\/g, '/')}`;
        
        if (!optimizedImages[width]) {
          optimizedImages[width] = {};
        }
        optimizedImages[width][format] = url;
      }
    }

    return optimizedImages;
  } catch (error) {
    console.error('Error optimizing image:', error);
    return null;
  }
}

/**
 * Generate srcset string for responsive images
 * @param {Object} optimizedImages - Object from optimizeImage()
 * @param {string} format - Format to use ('webp' or 'original')
 * @returns {string} - srcset string
 */
function generateSrcset(optimizedImages, format = 'webp') {
  if (!optimizedImages) return '';
  
  const srcsetParts = [];
  const widths = Object.keys(optimizedImages).sort((a, b) => parseInt(a) - parseInt(b));
  
  for (const width of widths) {
    const url = optimizedImages[width][format] || optimizedImages[width]['original'];
    if (url) {
      srcsetParts.push(`${url} ${width}w`);
    }
  }
  
  return srcsetParts.join(', ');
}

/**
 * Get optimal image URL based on viewport width
 * @param {Object} optimizedImages - Object from optimizeImage()
 * @param {number} viewportWidth - Viewport width in pixels
 * @param {string} format - Format preference
 * @returns {string} - Best image URL
 */
function getOptimalImageUrl(optimizedImages, viewportWidth = 1200, format = 'webp') {
  if (!optimizedImages) return '';
  
  const widths = Object.keys(optimizedImages)
    .map(w => parseInt(w))
    .sort((a, b) => a - b);
  
  // Find smallest width that's >= viewport width, or largest available
  let optimalWidth = widths[widths.length - 1]; // Default to largest
  for (const width of widths) {
    if (width >= viewportWidth) {
      optimalWidth = width;
      break;
    }
  }
  
  const url = optimizedImages[optimalWidth]?.[format] || optimizedImages[optimalWidth]?.['original'];
  return url || '';
}

module.exports = {
  optimizeImage,
  generateSrcset,
  getOptimalImageUrl
};

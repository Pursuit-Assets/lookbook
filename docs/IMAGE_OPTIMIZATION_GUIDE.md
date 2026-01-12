# Image Optimization Guide

## Overview
This guide covers implementing image optimization for the Lookbook app to improve loading performance by 50-70%.

## Current State
- Images are stored in `/backend/public/uploads/`
- Images are served statically via Express
- No image optimization or CDN currently configured

## Implementation Options

### Option 1: Sharp-based Optimization (Recommended for Self-Hosted)
**Pros:**
- Full control over image processing
- No external dependencies
- Works with existing file storage

**Cons:**
- Requires server resources
- Need to process images on upload
- Storage space increases (multiple sizes)

**Steps:**
1. Install sharp: `cd backend && npm install sharp`
2. Process images on upload to generate multiple sizes
3. Update frontend to use `srcset` for responsive images

### Option 2: CDN with Image Optimization (Recommended for Production)
**Options:**
- **Cloudinary** - Free tier: 25GB storage, 25GB bandwidth/month
- **Imgix** - Paid, but excellent performance
- **Cloudflare Images** - $5/month for 100k images
- **ImageKit** - Free tier: 20GB storage

**Pros:**
- Automatic optimization
- Global CDN distribution
- On-the-fly resizing
- WebP/AVIF conversion
- No server processing needed

**Cons:**
- External dependency
- May have costs at scale
- Requires API integration

### Option 3: Hybrid Approach
- Use Sharp for initial optimization on upload
- Serve optimized images via CDN
- Best of both worlds

## Recommended Implementation Plan

### Phase 1: Basic Optimization (Quick Win)
1. ✅ Add `loading="lazy"` to all images (already done)
2. ✅ Add responsive `srcset` support (frontend utility created)
3. Add image compression on upload (backend)

### Phase 2: Advanced Optimization
1. Set up CDN (Cloudinary recommended for free tier)
2. Generate multiple sizes on upload
3. Implement WebP conversion
4. Add image preloading for above-the-fold content

### Phase 3: Performance Monitoring
1. Track image load times
2. Monitor CDN usage
3. Optimize based on metrics

## Code Changes Required

### Backend
1. Install sharp: `npm install sharp`
2. Update upload routes to optimize images
3. Generate multiple sizes (400w, 800w, 1200w, 1600w)
4. Convert to WebP format

### Frontend
1. Use `getResponsiveImage()` helper for all images
2. Add `srcset` and `sizes` attributes
3. Implement image preloading for critical images

## Example Usage

### Backend (after sharp installation)
```javascript
const { optimizeImage } = require('./utils/imageOptimizer');

// On image upload
const optimized = await optimizeImage(imagePath, outputDir, {
  widths: [400, 800, 1200, 1600],
  quality: 80,
  formats: ['webp', 'original']
});
```

### Frontend
```javascript
import { getResponsiveImage } from '../utils/imageUtils';

const { src, srcset, sizes } = getResponsiveImage(project.main_image_url, {
  widths: [400, 800, 1200, 1600],
  sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
});

<img 
  src={src}
  srcSet={srcset}
  sizes={sizes}
  loading="lazy"
  alt={project.title}
/>
```

## Next Steps

1. **Immediate**: Update frontend to use responsive image helper
2. **Short-term**: Install sharp and optimize images on upload
3. **Long-term**: Set up CDN for production deployment

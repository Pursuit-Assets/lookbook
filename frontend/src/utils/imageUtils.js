/**
 * Image optimization utilities
 * Provides responsive image URLs and optimization helpers
 */

import { getImageUrl } from './api';

/**
 * Generate responsive image srcset for different screen sizes
 * @param {string} baseUrl - Base image URL
 * @param {Object} options - Options for image generation
 * @returns {Object} - Object with src, srcset, and sizes attributes
 */
export const getResponsiveImage = (baseUrl, options = {}) => {
  if (!baseUrl) return { src: '', srcset: '', sizes: '' };
  
  const {
    widths = [400, 800, 1200, 1600],
    sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    format = 'webp' // Future: support WebP conversion
  } = options;

  // For now, return the original image URL
  // In production, this would generate multiple sizes via CDN or image service
  const imageUrl = getImageUrl(baseUrl);
  
  // If it's already an external URL or base64, return as-is
  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://') || baseUrl.startsWith('data:image')) {
    return {
      src: imageUrl,
      srcset: '',
      sizes: ''
    };
  }

  // TODO: When CDN is set up, generate srcset like:
  // srcset="image-400w.webp 400w, image-800w.webp 800w, image-1200w.webp 1200w"
  
  return {
    src: imageUrl,
    srcset: '', // Will be populated when CDN is configured
    sizes: sizes
  };
};

/**
 * Get optimized image URL with size parameter
 * @param {string} url - Image URL
 * @param {number} width - Desired width in pixels
 * @param {number} quality - Quality (1-100), default 80
 * @returns {string} - Optimized image URL
 */
export const getOptimizedImageUrl = (url, width = null, quality = 80) => {
  if (!url) return url;
  
  const imageUrl = getImageUrl(url);
  
  // If it's base64 or external URL, return as-is
  if (url.startsWith('data:image') || url.startsWith('http://') || url.startsWith('https://')) {
    return imageUrl;
  }

  // TODO: When CDN/image service is configured, append size parameters:
  // return `${imageUrl}?w=${width}&q=${quality}&format=webp`;
  
  return imageUrl;
};

/**
 * Preload critical images
 * @param {string[]} urls - Array of image URLs to preload
 */
export const preloadImages = (urls) => {
  urls.forEach(url => {
    if (!url) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = getImageUrl(url);
    document.head.appendChild(link);
  });
};

/**
 * Lazy load image with intersection observer
 * @param {HTMLImageElement} img - Image element
 * @param {string} src - Image source URL
 */
export const lazyLoadImage = (img, src) => {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          img.src = getImageUrl(src);
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px' // Start loading 50px before image enters viewport
    });
    
    observer.observe(img);
  } else {
    // Fallback for browsers without IntersectionObserver
    img.src = getImageUrl(src);
  }
};

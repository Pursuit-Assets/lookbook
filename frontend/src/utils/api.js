// API utility for making requests to the backend
// Follows axios pattern with error handling

import axios from 'axios';
import { apiCache } from './cache';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4002/api';

// Helper to get the backend base URL (without /api)
const BACKEND_BASE_URL = API_BASE_URL.replace('/api', '');

const getGoogleDriveFileId = (url) => {
  if (!url || typeof url !== 'string') return null;

  const filePathMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (filePathMatch) return filePathMatch[1];

  try {
    const parsedUrl = new URL(url);
    if (
      parsedUrl.hostname === 'drive.google.com' ||
      parsedUrl.hostname === 'drive.usercontent.google.com'
    ) {
      return parsedUrl.searchParams.get('id');
    }
  } catch {
    return null;
  }

  return null;
};

// Helper function to convert relative image URLs to absolute URLs
export const getImageUrl = (url) => {
  if (!url) return url;

  const driveFileId = getGoogleDriveFileId(url);
  if (driveFileId) {
    return `${API_BASE_URL}/image-proxy/google-drive/${encodeURIComponent(driveFileId)}`;
  }
  
  // If it's already an absolute URL (http:// or https://), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's a base64 image, return as-is
  if (url.startsWith('data:image')) {
    return url;
  }
  
  // If it starts with /uploads, prepend the backend base URL
  if (url.startsWith('/uploads')) {
    const fullUrl = `${BACKEND_BASE_URL}${url}`;
    return fullUrl;
  }
  
  // Otherwise return as-is
  return url;
};

const pickUrlFromObject = (value) => {
  if (!value || typeof value !== 'object') return null;
  return (
    value.url ||
    value.src ||
    value.imageUrl ||
    value.image_url ||
    null
  );
};

// Supports direct URL strings and serialized image payloads.
export const extractFirstImageUrl = (value) => {
  if (!value) return null;

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    const first = value[0];
    return typeof first === 'string' ? first : pickUrlFromObject(first);
  }

  if (typeof value === 'object') {
    return pickUrlFromObject(value);
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if ((trimmed.startsWith('[') || trimmed.startsWith('{'))) {
    try {
      return extractFirstImageUrl(JSON.parse(trimmed));
    } catch {
      // Not valid JSON; fall back to plain string URL.
    }
  }

  return trimmed;
};

export const getVideoThumbnailUrl = (videoUrl) => {
  if (!videoUrl || typeof videoUrl !== 'string') return null;

  const youtubeMatch = videoUrl.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^"&?/\s]{11})/i
  );
  if (youtubeMatch) {
    return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;
  }

  const loomMatch = videoUrl.match(/loom\.com\/(?:share|embed)\/([a-z0-9]+)/i);
  if (loomMatch) {
    return `https://cdn.loom.com/sessions/thumbnails/${loomMatch[1]}-with-play.gif`;
  }

  return null;
};

export const getProjectTileImageUrl = (project) => {
  if (!project) return null;

  const rawImage =
    extractFirstImageUrl(project.card_background_url) ||
    extractFirstImageUrl(project.main_image_url) ||
    extractFirstImageUrl(project.icon_url);

  if (rawImage) return getImageUrl(rawImage);

  return getVideoThumbnailUrl(project.demo_video_url);
};

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor (for adding auth tokens later)
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (for error handling)
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response || error);
    // Ensure error.response.data is preserved for error handling
    if (error.response && error.response.data) {
      // Attach the error data to the error object for easier access
      error.responseData = error.response.data;
    }
    return Promise.reject(error);
  }
);

// Retry helper with exponential backoff
const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      // Don't retry on 4xx errors (client errors)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
  throw lastError;
};

// Cached GET helper with request deduplication and retry logic
const cachedGet = async (url, cacheKey, ttl = 60000) => {
  // Check cache first
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Check if there's already a pending request for this key
  const pending = apiCache.getPendingRequest(cacheKey);
  if (pending) {
    return pending;
  }
  
  // Make the request with retry logic and cache it
  const requestPromise = retryRequest(() => api.get(url)).then(result => {
    apiCache.set(cacheKey, result, ttl);
    return result;
  }).catch(error => {
    // Remove pending request on error so it can be retried
    apiCache.pendingRequests.delete(cacheKey);
    throw error;
  });
  
  apiCache.setPendingRequest(cacheKey, requestPromise);
  return requestPromise;
};

// Cached GET with params helper - generates cache key from URL + params
const cachedGetWithParams = async (url, params = {}, cacheKeyPrefix, ttl = 120000) => {
  // Generate cache key from URL and sorted params
  const sortedParams = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map(key => {
      const value = params[key];
      if (Array.isArray(value)) {
        return `${key}=${value.sort().join(',')}`;
      }
      return `${key}=${value}`;
    })
    .join('&');
  const cacheKey = `${cacheKeyPrefix}:${url}${sortedParams ? `?${sortedParams}` : ''}`;
  
  // Build query string properly
  const queryParams = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      if (Array.isArray(params[key])) {
        params[key].forEach(val => queryParams.append(key, val));
      } else {
        queryParams.append(key, params[key]);
      }
    }
  });
  const queryString = queryParams.toString();
  const fullUrl = `${url}${queryString ? `?${queryString}` : ''}`;
  
  return cachedGet(fullUrl, cacheKey, ttl);
};

// =====================================================
// PROFILE ENDPOINTS
// =====================================================

export const profilesAPI = {
  getAll: (filters = {}) => {
    return cachedGetWithParams('/profiles', filters, 'profiles-list', 300000); // 5-min cache
  },
  getBySlug: (slug, options = {}) => {
    if (options.includeIncomplete) {
      return cachedGetWithParams(
        `/profiles/${slug}`,
        { includeIncomplete: true },
        `profile-${slug}-admin`,
        120000
      );
    }
    return cachedGet(`/profiles/${slug}`, `profile-${slug}`, 120000);
  },
  getFilters: () => cachedGet('/profiles/filters', 'profiles-filters', 300000), // Cache for 5 minutes
  create: (data) => {
    apiCache.clear(); // Invalidate on create
    return api.post('/profiles', data);
  },
  update: (slug, data) => {
    apiCache.delete(`profile-${slug}`);
    apiCache.getKeys().filter(k => k.startsWith('profiles-list:')).forEach(k => apiCache.delete(k));
    return api.put(`/profiles/${slug}`, data);
  },
  delete: (slug) => {
    apiCache.delete(`profile-${slug}`);
    apiCache.clear(); // Invalidate all on delete
    return api.delete(`/profiles/${slug}`);
  },
  addExperience: (slug, data) => api.post(`/profiles/${slug}/experience`, data),
  getAvailableUsers: (filters = {}) => api.get('/profiles/available-users', { params: filters }),
  bulkCreate: (userIds) => {
    apiCache.clear();
    return api.post('/profiles/bulk', { userIds });
  },
};

// =====================================================
// PROJECT ENDPOINTS
// =====================================================

export const projectsAPI = {
  // Use cached GET with params for list views - cache for 5 minutes
  // Only include participants when explicitly requested (for detail views)
  getAll: (filters = {}) => {
    // For detail views that need participants, don't cache (always fresh)
    if (filters.includeParticipants) {
      return api.get('/projects', { params: filters });
    }
    // For list/grid views, use caching with deduplication (5 min cache)
    return cachedGetWithParams('/projects', filters, 'projects-list', 300000);
  },
  getBySlug: (slug) => cachedGet(`/projects/${slug}`, `project-${slug}`, 300000), // Cache for 5 minutes
  getFilters: () => cachedGet('/projects/filters', 'projects-filters', 300000), // Cache for 5 minutes
  create: (data) => {
    // Invalidate cache on create
    apiCache.clear();
    return api.post('/projects', data);
  },
  update: (slug, data) => {
    // Invalidate cache on update
    apiCache.delete(`project-${slug}`);
    // Clear list cache since project might have changed
    const keysToDelete = apiCache.getKeys().filter(key => key.startsWith('projects-list:'));
    keysToDelete.forEach(key => apiCache.delete(key));
    return api.put(`/projects/${slug}`, data);
  },
  delete: (slug) => {
    // Invalidate cache on delete
    apiCache.delete(`project-${slug}`);
    apiCache.clear(); // Clear all project caches
    return api.delete(`/projects/${slug}`);
  },
  addParticipant: (slug, data) => api.post(`/projects/${slug}/participants`, data),
  removeParticipant: (slug, profileSlug) => api.delete(`/projects/${slug}/participants/${profileSlug}`),
};

// =====================================================
// SEARCH ENDPOINTS
// =====================================================

export const searchAPI = {
  search: (query) => api.post('/search', query),
  suggestions: (q, type) => api.get('/search/suggestions', { params: { q, type } }),
};

// =====================================================
// SHAREPACK ENDPOINTS
// =====================================================

export const sharepackAPI = {
  generate: (data) => api.post('/sharepack', data, { responseType: 'blob' }),
  logLead: (data) => api.post('/sharepack/lead', data),
  getInsights: () => api.get('/sharepack/insights'),
};

// =====================================================
// AI ENDPOINTS
// =====================================================

export const aiAPI = {
  extract: (sourceText) => api.post('/ai/extract', { sourceText }),
  sanitize: (profileData) => api.post('/ai/sanitize', { profileData }),
};

// =====================================================
// TAXONOMY ENDPOINTS (Skills & Industries)
// =====================================================

export const taxonomyAPI = {
  // Skills
  getAllSkills: () => api.get('/taxonomy/skills'),
  createSkill: (data) => api.post('/taxonomy/skills', data),
  updateSkill: (id, data) => api.put(`/taxonomy/skills/${id}`, data),
  deleteSkill: (id) => api.delete(`/taxonomy/skills/${id}`),
  
  // Industries
  getAllIndustries: () => api.get('/taxonomy/industries'),
  createIndustry: (data) => api.post('/taxonomy/industries', data),
  updateIndustry: (id, data) => api.put(`/taxonomy/industries/${id}`, data),
  deleteIndustry: (id) => api.delete(`/taxonomy/industries/${id}`),
};

// =====================================================
// INITIATIVES ENDPOINTS
// =====================================================

export const initiativesAPI = {
  getAll: (includeInactive = false, options = {}) => {
    const fresh = includeInactive || options.fresh;
    const params = fresh
      ? { includeInactive, _ts: Date.now() }
      : { includeInactive };

    return api.get('/initiatives', {
      params,
      headers: fresh ? { 'Cache-Control': 'no-cache' } : undefined,
    });
  },
  getBySlug: (slug) => api.get(`/initiatives/${slug}`),
  create: (data) => api.post('/initiatives', data),
  update: (id, data) => api.put(`/initiatives/${id}`, data),
  delete: (id) => api.delete(`/initiatives/${id}`),
};

// =====================================================
// EXTERNAL CONTRIBUTOR ENDPOINTS
// =====================================================

export const externalContributorsAPI = {
  getAll: () => api.get('/external-contributors'),
  create: (data) => api.post('/external-contributors', data),
  update: (id, data) => api.put(`/external-contributors/${id}`, data),
  delete: (id) => api.delete(`/external-contributors/${id}`),
};

export default api;



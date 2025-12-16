// API utility for making requests to the backend
// Follows axios pattern with error handling

import axios from 'axios';
import { apiCache } from './cache';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4002/api';

// Helper to get the backend base URL (without /api)
const BACKEND_BASE_URL = API_BASE_URL.replace('/api', '');

// Helper function to convert relative image URLs to absolute URLs
export const getImageUrl = (url) => {
  if (!url) return url;
  
  // Debug logging
  console.log('getImageUrl called with:', url);
  
  // If it's already an absolute URL (http:// or https://), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('  -> Already absolute, returning:', url);
    return url;
  }
  
  // If it's a base64 image, return as-is
  if (url.startsWith('data:image')) {
    console.log('  -> Base64 image, returning as-is');
    return url;
  }
  
  // If it starts with /uploads, prepend the backend base URL
  if (url.startsWith('/uploads')) {
    const fullUrl = `${BACKEND_BASE_URL}${url}`;
    console.log('  -> Converting to:', fullUrl);
    return fullUrl;
  }
  
  // Otherwise return as-is
  console.log('  -> No match, returning as-is:', url);
  return url;
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
    const token = localStorage.getItem('token');
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

// Cached GET helper with request deduplication
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
  
  // Make the request and cache it
  const requestPromise = api.get(url).then(result => {
    apiCache.set(cacheKey, result, ttl);
    return result;
  });
  
  apiCache.setPendingRequest(cacheKey, requestPromise);
  return requestPromise;
};

// =====================================================
// PROFILE ENDPOINTS
// =====================================================

export const profilesAPI = {
  getAll: (filters = {}) => api.get('/profiles', { params: filters }),
  getBySlug: (slug) => cachedGet(`/profiles/${slug}`, `profile-${slug}`, 120000), // Cache for 2 minutes
  getFilters: () => cachedGet('/profiles/filters', 'profiles-filters', 300000), // Cache for 5 minutes
  create: (data) => api.post('/profiles', data),
  update: (slug, data) => api.put(`/profiles/${slug}`, data),
  delete: (slug) => api.delete(`/profiles/${slug}`),
  addExperience: (slug, data) => api.post(`/profiles/${slug}/experience`, data),
};

// =====================================================
// PROJECT ENDPOINTS
// =====================================================

export const projectsAPI = {
  getAll: (filters = {}) => api.get('/projects', { params: filters }),
  getBySlug: (slug) => cachedGet(`/projects/${slug}`, `project-${slug}`, 120000), // Cache for 2 minutes
  getFilters: () => cachedGet('/projects/filters', 'projects-filters', 300000), // Cache for 5 minutes
  create: (data) => api.post('/projects', data),
  update: (slug, data) => api.put(`/projects/${slug}`, data),
  delete: (slug) => api.delete(`/projects/${slug}`),
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
  getAll: (includeInactive = false) => api.get('/initiatives', { params: { includeInactive } }),
  getBySlug: (slug) => api.get(`/initiatives/${slug}`),
  create: (data) => api.post('/initiatives', data),
  update: (id, data) => api.put(`/initiatives/${id}`, data),
  delete: (id) => api.delete(`/initiatives/${id}`),
};

export default api;



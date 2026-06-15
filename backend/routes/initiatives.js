// Initiative routes for Lookbook
// CRUD endpoints for project initiatives/cohorts

const express = require('express');
const router = express.Router();
const initiativeQueries = require('../queries/initiativeQueries');

// Simple in-memory cache for initiatives (to reduce database load)
const initiativeCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes (initiatives don't change frequently)

function getCacheKey(includeInactive) {
  return `initiatives_${includeInactive ? 'all' : 'active'}`;
}

function getCachedInitiatives(cacheKey) {
  const cached = initiativeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedInitiatives(cacheKey, data) {
  initiativeCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
}

function setInitiativesCacheHeaders(res, includeInactive) {
  if (includeInactive) {
    res.set('Cache-Control', 'no-store');
    return;
  }

  // The public list carries each initiative's live `project_count`, which changes
  // whenever a project is published/unpublished and drives sidebar visibility.
  // Use revalidation (cheap 304s via ETag) instead of a hard 10-min cache so
  // publish/unpublish reflects immediately rather than lagging up to 10 minutes.
  res.set('Cache-Control', 'no-cache');
}

// Changing an initiative's visibility (is_active), creating, or deleting one
// affects which projects appear publicly, so the project cache must also be
// invalidated. Required lazily to avoid a circular dependency with projects.js.
function clearProjectCache() {
  try {
    require('./projects').clearProjectCache();
  } catch (err) {
    console.warn('Could not clear project cache from initiatives route:', err.message);
  }
}

// Helper to generate slug from name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// =====================================================
// GET ALL INITIATIVES
// =====================================================

router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const shouldUseCache = !includeInactive;
    
    // Check cache first
    const cacheKey = getCacheKey(includeInactive);
    const cachedResult = shouldUseCache ? getCachedInitiatives(cacheKey) : null;
    if (cachedResult) {
      console.log(`📦 Cache HIT for initiatives query`);
      setInitiativesCacheHeaders(res, includeInactive);
      return res.json({
        success: true,
        data: cachedResult
      });
    }
    
    // Cache miss - fetch from database
    console.log(`📦 Cache MISS for initiatives query - fetching from database`);
    const startTime = Date.now();
    
    // getAllInitiatives now returns initiatives with project_count already included
    // This avoids the N+1 query problem by using a single JOIN query
    const initiatives = await initiativeQueries.getAllInitiatives(includeInactive);
    
    const queryTime = Date.now() - startTime;
    
    // Cache the result
    if (shouldUseCache) {
      setCachedInitiatives(cacheKey, initiatives);
    }
    
    console.log(`✅ Fetched ${initiatives.length} initiatives in ${queryTime}ms${shouldUseCache ? ' (cached for next request)' : ''}`);

    setInitiativesCacheHeaders(res, includeInactive);
    res.json({
      success: true,
      data: initiatives
    });
  } catch (error) {
    console.error('Error fetching initiatives:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch initiatives'
    });
  }
});

// =====================================================
// GET INITIATIVE BY SLUG
// =====================================================

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const initiative = await initiativeQueries.getInitiativeBySlug(slug);
    
    if (!initiative) {
      return res.status(404).json({
        success: false,
        error: 'Initiative not found'
      });
    }
    
    // Get project count
    const projectCount = await initiativeQueries.getProjectCountByInitiative(initiative.cohort_value);

    // project_count changes on publish/unpublish — revalidate instead of hard-caching.
    res.set('Cache-Control', 'no-cache');
    res.json({
      success: true,
      data: {
        ...initiative,
        project_count: projectCount
      }
    });
  } catch (error) {
    console.error('Error fetching initiative:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch initiative'
    });
  }
});

// =====================================================
// CREATE INITIATIVE
// =====================================================

router.post('/', async (req, res) => {
  try {
    const { name, description, cohortValue, displayOrder, isActive } = req.body;
    
    if (!name || !cohortValue) {
      return res.status(400).json({
        success: false,
        error: 'Name and cohort value are required'
      });
    }
    
    // Generate slug from name
    const slug = generateSlug(name);
    
    const initiative = await initiativeQueries.createInitiative({
      slug,
      name,
      description,
      cohortValue,
      displayOrder,
      isActive
    });
    
    // Clear cache when initiative is created
    initiativeCache.clear();
    clearProjectCache();
    
    res.status(201).json({
      success: true,
      data: initiative
    });
  } catch (error) {
    console.error('Error creating initiative:', error);
    
    // Check for unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'An initiative with this name or cohort value already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create initiative'
    });
  }
});

// =====================================================
// UPDATE INITIATIVE
// =====================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // If name is being updated, also update the slug
    if (updates.name) {
      updates.slug = generateSlug(updates.name);
    }
    
    const initiative = await initiativeQueries.updateInitiative(id, updates);
    
    if (!initiative) {
      return res.status(404).json({
        success: false,
        error: 'Initiative not found'
      });
    }
    
    // Clear cache when initiative is updated (visibility toggle changes which
    // projects are public, so invalidate the project cache too).
    initiativeCache.clear();
    clearProjectCache();
    
    res.json({
      success: true,
      data: initiative
    });
  } catch (error) {
    console.error('Error updating initiative:', error);
    
    // Check for unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'An initiative with this name or cohort value already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update initiative'
    });
  }
});

// =====================================================
// DELETE INITIATIVE
// =====================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const initiative = await initiativeQueries.deleteInitiative(id);
    
    if (!initiative) {
      return res.status(404).json({
        success: false,
        error: 'Initiative not found'
      });
    }
    
    // Clear cache when initiative is deleted
    initiativeCache.clear();
    clearProjectCache();
    
    res.json({
      success: true,
      data: initiative
    });
  } catch (error) {
    console.error('Error deleting initiative:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete initiative'
    });
  }
});

// Allow other routes (e.g. project publish/unpublish) to invalidate the
// initiative cache so project_count reflects status changes immediately.
function clearInitiativeCache() {
  initiativeCache.clear();
}

module.exports = router;
module.exports.clearInitiativeCache = clearInitiativeCache;


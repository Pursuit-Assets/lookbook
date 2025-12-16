// Initiative routes for Lookbook
// CRUD endpoints for project initiatives/cohorts

const express = require('express');
const router = express.Router();
const initiativeQueries = require('../queries/initiativeQueries');

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
    const initiatives = await initiativeQueries.getAllInitiatives(includeInactive);
    
    // Get project counts for each initiative
    const initiativesWithCounts = await Promise.all(
      initiatives.map(async (initiative) => {
        const projectCount = await initiativeQueries.getProjectCountByInitiative(initiative.cohort_value);
        return {
          ...initiative,
          project_count: projectCount
        };
      })
    );
    
    res.json({
      success: true,
      data: initiativesWithCounts
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

module.exports = router;


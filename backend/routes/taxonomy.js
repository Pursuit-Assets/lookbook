const express = require('express');
const router = express.Router();
const taxonomyQueries = require('../queries/taxonomyQueries');

/**
 * GET /api/taxonomy/skills
 * Get all skills
 */
router.get('/skills', async (req, res) => {
  try {
    const skills = await taxonomyQueries.getAllSkills();
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      success: true,
      data: skills,
      total: skills.length
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch skills' 
    });
  }
});

/**
 * GET /api/taxonomy/industries
 * Get all industries
 */
router.get('/industries', async (req, res) => {
  try {
    const industries = await taxonomyQueries.getAllIndustries();
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      success: true,
      data: industries,
      total: industries.length
    });
  } catch (error) {
    console.error('Error fetching industries:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch industries' 
    });
  }
});

/**
 * POST /api/taxonomy/skills
 * Create a new skill
 */
router.post('/skills', async (req, res) => {
  try {
    const { name, category, display_order } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Skill name is required' 
      });
    }

    const skill = await taxonomyQueries.createSkill({ 
      name: name.trim(), 
      category, 
      display_order 
    });
    
    res.status(201).json({ 
      success: true, 
      data: skill,
      message: 'Skill created successfully'
    });
  } catch (error) {
    console.error('Error creating skill:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ 
        success: false, 
        error: 'A skill with this name already exists' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create skill' 
      });
    }
  }
});

/**
 * POST /api/taxonomy/industries
 * Create a new industry
 */
router.post('/industries', async (req, res) => {
  try {
    const { name, description, display_order } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Industry name is required' 
      });
    }

    const industry = await taxonomyQueries.createIndustry({ 
      name: name.trim(), 
      description, 
      display_order 
    });
    
    res.status(201).json({ 
      success: true, 
      data: industry,
      message: 'Industry created successfully'
    });
  } catch (error) {
    console.error('Error creating industry:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ 
        success: false, 
        error: 'An industry with this name already exists' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create industry' 
      });
    }
  }
});

/**
 * PUT /api/taxonomy/skills/:id
 * Update a skill
 */
router.put('/skills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, display_order } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Skill name is required' 
      });
    }

    const skill = await taxonomyQueries.updateSkill(id, { 
      name: name.trim(), 
      category, 
      display_order 
    });
    
    if (!skill) {
      return res.status(404).json({ 
        success: false, 
        error: 'Skill not found' 
      });
    }

    res.json({ 
      success: true, 
      data: skill,
      message: 'Skill updated successfully'
    });
  } catch (error) {
    console.error('Error updating skill:', error);
    if (error.code === '23505') {
      res.status(409).json({ 
        success: false, 
        error: 'A skill with this name already exists' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update skill' 
      });
    }
  }
});

/**
 * PUT /api/taxonomy/industries/:id
 * Update an industry
 */
router.put('/industries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, display_order } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Industry name is required' 
      });
    }

    const industry = await taxonomyQueries.updateIndustry(id, { 
      name: name.trim(), 
      description, 
      display_order 
    });
    
    if (!industry) {
      return res.status(404).json({ 
        success: false, 
        error: 'Industry not found' 
      });
    }

    res.json({ 
      success: true, 
      data: industry,
      message: 'Industry updated successfully'
    });
  } catch (error) {
    console.error('Error updating industry:', error);
    if (error.code === '23505') {
      res.status(409).json({ 
        success: false, 
        error: 'An industry with this name already exists' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update industry' 
      });
    }
  }
});

/**
 * DELETE /api/taxonomy/skills/:id
 * Delete a skill
 */
router.delete('/skills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const skill = await taxonomyQueries.deleteSkill(id);
    
    if (!skill) {
      return res.status(404).json({ 
        success: false, 
        error: 'Skill not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Skill deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete skill' 
    });
  }
});

/**
 * DELETE /api/taxonomy/industries/:id
 * Delete an industry
 */
router.delete('/industries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const industry = await taxonomyQueries.deleteIndustry(id);
    
    if (!industry) {
      return res.status(404).json({ 
        success: false, 
        error: 'Industry not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Industry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting industry:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete industry' 
    });
  }
});

module.exports = router;


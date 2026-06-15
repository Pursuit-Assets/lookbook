// Search routes for Lookbook API
// Simple keyword search - semantic search can be added later

const express = require('express');
const router = express.Router();
const profileQueries = require('../queries/profileQueries');
const projectQueries = require('../queries/projectQueries');

// =====================================================
// POST /api/search
// Unified search across people and projects
// =====================================================

router.post('/', async (req, res) => {
  try {
    const { 
      q, // search query
      type = 'all', // 'people', 'projects', 'all'
      skills,
      sectors,
      openToWork,
      limit = 20
    } = req.body;
    
    const results = {
      query: q,
      people: [],
      projects: []
    };
    
    // Search people
    if (type === 'all' || type === 'people') {
      const peopleFilters = {
        search: q,
        skills: skills || undefined,
        openToWork: openToWork !== undefined ? openToWork : undefined,
        limit: type === 'all' ? Math.floor(limit / 2) : limit
      };
      
      const peopleResult = await profileQueries.getAllProfiles(peopleFilters);
      results.people = peopleResult.profiles;
    }
    
    // Search projects
    if (type === 'all' || type === 'projects') {
      const projectFilters = {
        search: q,
        skills: skills || undefined,
        sectors: sectors || undefined,
        // Public search must never surface projects from hidden initiatives.
        excludeHiddenInitiatives: true,
        limit: type === 'all' ? Math.floor(limit / 2) : limit
      };
      
      const projectsResult = await projectQueries.getAllProjects(projectFilters);
      results.projects = projectsResult.projects;
    }
    
    res.json({
      success: true,
      data: results,
      meta: {
        totalPeople: results.people.length,
        totalProjects: results.projects.length,
        searchType: type
      }
    });
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({ 
      success: false,
      error: 'Search failed',
      message: error.message 
    });
  }
});

// =====================================================
// GET /api/search/suggestions
// Get search suggestions based on skills/sectors
// =====================================================

router.get('/suggestions', async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;
    
    const suggestions = {
      skills: [],
      sectors: [],
      industries: []
    };
    
    if (!q || q.length < 2) {
      return res.json({ success: true, data: suggestions });
    }
    
    // Get all available options
    const [projectSkills, projectSectors, profileSkills, profileIndustries] = await Promise.all([
      projectQueries.getAllSkills(),
      projectQueries.getAllSectors(),
      profileQueries.getAllSkills(),
      profileQueries.getAllIndustries()
    ]);
    
    // Merge and filter based on query
    const allSkills = [...new Set([...projectSkills, ...profileSkills])];
    const query = q.toLowerCase();
    
    suggestions.skills = allSkills.filter(skill => 
      skill.toLowerCase().includes(query)
    ).slice(0, 10);
    
    suggestions.sectors = projectSectors.filter(sector => 
      sector.toLowerCase().includes(query)
    ).slice(0, 10);
    
    suggestions.industries = profileIndustries.filter(industry => 
      industry.toLowerCase().includes(query)
    ).slice(0, 10);
    
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch suggestions',
      message: error.message 
    });
  }
});

module.exports = router;



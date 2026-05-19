// External contributor routes for project participants outside Lookbook profiles.

const express = require('express');
const router = express.Router();
const externalContributorQueries = require('../queries/externalContributorQueries');

router.get('/', async (req, res) => {
  try {
    const contributors = await externalContributorQueries.getAllExternalContributors();
    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      data: contributors
    });
  } catch (error) {
    console.error('Error fetching external contributors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch external contributors',
      message: error.message
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const contributor = await externalContributorQueries.createExternalContributor({
      ...req.body,
      name: name.trim()
    });

    res.status(201).json({
      success: true,
      data: contributor
    });
  } catch (error) {
    console.error('Error creating external contributor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create external contributor',
      message: error.message
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const contributor = await externalContributorQueries.updateExternalContributor(req.params.id, req.body);

    if (!contributor) {
      return res.status(404).json({
        success: false,
        error: 'External contributor not found'
      });
    }

    res.json({
      success: true,
      data: contributor
    });
  } catch (error) {
    console.error('Error updating external contributor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update external contributor',
      message: error.message
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const contributor = await externalContributorQueries.deleteExternalContributor(req.params.id);

    if (!contributor) {
      return res.status(404).json({
        success: false,
        error: 'External contributor not found'
      });
    }

    res.json({
      success: true,
      data: contributor
    });
  } catch (error) {
    console.error('Error deleting external contributor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete external contributor',
      message: error.message
    });
  }
});

module.exports = router;

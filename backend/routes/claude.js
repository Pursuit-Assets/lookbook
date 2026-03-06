// Claude (Anthropic) routes for Lookbook API
// Generic chat endpoint as a foundation for future Claude-powered features

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// =====================================================
// POST /api/claude/chat
// Generic chat endpoint — accepts messages array and
// optional system prompt. Foundation for future features.
// =====================================================

router.post('/chat', async (req, res) => {
  try {
    if (!anthropic) {
      return res.status(503).json({
        success: false,
        error: 'Claude not available',
        message: 'ANTHROPIC_API_KEY not configured'
      });
    }

    const {
      messages,
      system,
      model = 'claude-sonnet-4-6',
      maxTokens = 1024
    } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'messages is required and must be a non-empty array of {role, content} objects'
      });
    }

    const params = {
      model,
      max_tokens: maxTokens,
      messages
    };

    if (system) {
      params.system = system;
    }

    const response = await anthropic.messages.create(params);

    res.json({
      success: true,
      content: response.content[0].text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      }
    });

  } catch (error) {
    console.error('Error in Claude chat:', error);
    res.status(500).json({
      success: false,
      error: 'Claude chat failed',
      message: error.message
    });
  }
});

module.exports = router;

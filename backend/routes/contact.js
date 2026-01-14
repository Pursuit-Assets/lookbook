// Contact form API route
const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConfig');

// POST /api/contact - Submit contact form
router.post('/', async (req, res) => {
  try {
    const { name, email, company = '', interests = [], message = '' } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    // Log to database
    try {
      // Create table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS contact_submissions (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          company VARCHAR(255),
          interests TEXT[],
          message TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await pool.query(
        `INSERT INTO contact_submissions (name, email, company, interests, message, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [name, email, company, interests, message]
      );
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue even if DB fails - we still want to forward to webhook
    }

    // Forward to Google Sheets webhook (if configured)
    const webhookUrl = process.env.CONTACT_WEBHOOK_URL;

    if (webhookUrl) {
      try {
        const webhookRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            company,
            interests: interests.join(', '),
            message,
            source: 'lookbook',
            timestamp: new Date().toISOString(),
          }),
        });

        if (!webhookRes.ok) {
          console.error('Webhook failed:', await webhookRes.text());
        }
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
        // Don't fail the request if webhook fails
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit contact form'
    });
  }
});

module.exports = router;

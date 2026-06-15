// Sharepack routes for Lookbook API
// Generate PDFs and track sharing events

const express = require('express');
const router = express.Router();
const { pool } = require('../db/dbConfig');
const profileQueries = require('../queries/profileQueries');
const projectQueries = require('../queries/projectQueries');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// =====================================================
// POST /api/sharepack
// Generate PDF sharepack
// =====================================================

router.post('/', async (req, res) => {
  try {
    const { peopleSlugs = [], projectSlugs = [], requesterEmail } = req.body;
    
    // Fetch all requested profiles and projects
    const profiles = await Promise.all(
      peopleSlugs.map(slug => profileQueries.getProfileBySlug(slug))
    );
    
    const projects = await Promise.all(
      projectSlugs.map(slug => projectQueries.getProjectBySlug(slug))
    );
    
    // Filter out nulls and non-published projects (drafts/archived must not leak into PDFs).
    // A hidden initiative also suppresses its projects, overriding their own status.
    const validProfiles = profiles.filter(p => p !== null);
    const validProjects = projects.filter(p => p !== null && p.status === 'active' && !p.initiative_hidden);
    
    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Add title page
    let page = pdfDoc.addPage([612, 792]); // US Letter size
    let y = 700;
    
    page.drawText('Lookbook Sharepack', {
      x: 50,
      y,
      size: 24,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1)
    });
    
    y -= 30;
    page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y,
      size: 12,
      font,
      color: rgb(0.4, 0.4, 0.4)
    });
    
    y -= 60;
    
    // Add people section
    if (validProfiles.length > 0) {
      page.drawText('People', {
        x: 50,
        y,
        size: 18,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1)
      });
      y -= 30;
      
      for (const profile of validProfiles) {
        if (y < 100) {
          page = pdfDoc.addPage([612, 792]);
          y = 700;
        }
        
        page.drawText(profile.name || 'Unknown', {
          x: 50,
          y,
          size: 14,
          font: boldFont,
          color: rgb(0.2, 0.2, 0.2)
        });
        y -= 18;
        
        if (profile.title) {
          page.drawText(profile.title, {
            x: 50,
            y,
            size: 11,
            font,
            color: rgb(0.3, 0.3, 0.3)
          });
          y -= 16;
        }
        
        if (profile.skills && profile.skills.length > 0) {
          page.drawText(`Skills: ${profile.skills.slice(0, 8).join(', ')}`, {
            x: 50,
            y,
            size: 10,
            font,
            color: rgb(0.4, 0.4, 0.4)
          });
          y -= 16;
        }
        
        if (profile.bio) {
          const bioLines = wrapText(profile.bio, 75);
          for (const line of bioLines.slice(0, 3)) {
            if (y < 100) {
              page = pdfDoc.addPage([612, 792]);
              y = 700;
            }
            page.drawText(line, {
              x: 50,
              y,
              size: 10,
              font,
              color: rgb(0.3, 0.3, 0.3)
            });
            y -= 14;
          }
        }
        
        y -= 10;
      }
    }
    
    // Add projects section
    if (validProjects.length > 0) {
      if (y < 200) {
        page = pdfDoc.addPage([612, 792]);
        y = 700;
      }
      
      y -= 30;
      page.drawText('Projects', {
        x: 50,
        y,
        size: 18,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1)
      });
      y -= 30;
      
      for (const project of validProjects) {
        if (y < 100) {
          page = pdfDoc.addPage([612, 792]);
          y = 700;
        }
        
        page.drawText(project.title, {
          x: 50,
          y,
          size: 14,
          font: boldFont,
          color: rgb(0.2, 0.2, 0.2)
        });
        y -= 18;
        
        if (project.skills && project.skills.length > 0) {
          page.drawText(`Tech: ${project.skills.slice(0, 6).join(', ')}`, {
            x: 50,
            y,
            size: 10,
            font,
            color: rgb(0.4, 0.4, 0.4)
          });
          y -= 16;
        }
        
        if (project.summary) {
          const summaryLines = wrapText(project.summary, 75);
          for (const line of summaryLines.slice(0, 3)) {
            if (y < 100) {
              page = pdfDoc.addPage([612, 792]);
              y = 700;
            }
            page.drawText(line, {
              x: 50,
              y,
              size: 10,
              font,
              color: rgb(0.3, 0.3, 0.3)
            });
            y -= 14;
          }
        }
        
        y -= 10;
      }
    }
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Log the event
    await pool.query(`
      INSERT INTO lookbook_sharepack_events (
        kind, requester_email, people_count, projects_count, 
        people_slugs, project_slugs
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      'sharepack',
      requesterEmail || 'anonymous',
      validProfiles.length,
      validProjects.length,
      peopleSlugs,
      projectSlugs
    ]);
    
    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=lookbook-sharepack.pdf');
    res.send(Buffer.from(pdfBytes));
    
  } catch (error) {
    console.error('Error generating sharepack:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate sharepack',
      message: error.message 
    });
  }
});

// =====================================================
// POST /api/sharepack/lead
// Log CRM lead event
// =====================================================

router.post('/lead', async (req, res) => {
  try {
    const { email, note, peopleSlugs = [], projectSlugs = [] } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    // Log the lead event
    await pool.query(`
      INSERT INTO lookbook_sharepack_events (
        kind, requester_email, people_count, projects_count,
        people_slugs, project_slugs, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      'lead',
      email,
      peopleSlugs.length,
      projectSlugs.length,
      peopleSlugs,
      projectSlugs,
      JSON.stringify({ note })
    ]);
    
    // Optional: Forward to CRM webhook
    if (process.env.CRM_WEBHOOK_URL) {
      try {
        const fetch = require('node-fetch');
        const headers = {
          'Content-Type': 'application/json'
        };
        
        if (process.env.CRM_WEBHOOK_AUTH) {
          headers['Authorization'] = process.env.CRM_WEBHOOK_AUTH;
        }
        
        await fetch(process.env.CRM_WEBHOOK_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({ email, note, peopleSlugs, projectSlugs })
        });
      } catch (webhookError) {
        console.error('CRM webhook error:', webhookError);
        // Don't fail the request if webhook fails
      }
    }
    
    res.json({
      success: true,
      message: 'Lead logged successfully'
    });
    
  } catch (error) {
    console.error('Error logging lead:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to log lead',
      message: error.message 
    });
  }
});

// =====================================================
// GET /api/sharepack/insights
// Get analytics/insights
// =====================================================

router.get('/insights', async (req, res) => {
  try {
    // Total events
    const totalResult = await pool.query(`
      SELECT kind, COUNT(*) as count
      FROM lookbook_sharepack_events
      GROUP BY kind
    `);
    
    // Last 30 days
    const recentResult = await pool.query(`
      SELECT kind, COUNT(*) as count
      FROM lookbook_sharepack_events
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY kind
    `);
    
    // Most requested people
    const topPeopleResult = await pool.query(`
      SELECT 
        unnest(people_slugs) as slug,
        COUNT(*) as request_count
      FROM lookbook_sharepack_events
      WHERE array_length(people_slugs, 1) > 0
      GROUP BY slug
      ORDER BY request_count DESC
      LIMIT 10
    `);
    
    // Most requested projects
    const topProjectsResult = await pool.query(`
      SELECT 
        unnest(project_slugs) as slug,
        COUNT(*) as request_count
      FROM lookbook_sharepack_events
      WHERE array_length(project_slugs, 1) > 0
      GROUP BY slug
      ORDER BY request_count DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: {
        total: totalResult.rows,
        last30Days: recentResult.rows,
        topPeople: topPeopleResult.rows,
        topProjects: topProjectsResult.rows
      }
    });
    
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch insights',
      message: error.message 
    });
  }
});

// Helper function to wrap text
function wrapText(text, maxLength) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}

module.exports = router;



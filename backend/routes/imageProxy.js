const express = require('express');

const router = express.Router();

const DRIVE_FILE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

router.get('/google-drive/:fileId', async (req, res) => {
  const { fileId } = req.params;

  if (!DRIVE_FILE_ID_PATTERN.test(fileId)) {
    return res.status(400).json({ error: 'Invalid Google Drive file ID' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const thumbnailUrl = `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000`;

  try {
    const response = await fetch(thumbnailUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Image could not be loaded' });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return res.status(502).json({ error: 'Google Drive response was not an image' });
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    res.set({
      'Content-Type': contentType,
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=604800, immutable'
    });
    return res.send(imageBuffer);
  } catch (error) {
    const status = error.name === 'AbortError' ? 504 : 502;
    return res.status(status).json({ error: 'Image proxy failed' });
  } finally {
    clearTimeout(timeout);
  }
});

module.exports = router;

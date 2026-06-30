// Admin Authentication Routes
// Simple authentication for admin access

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

// JWT secret (should be in env variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// Admin credentials (in production, store in database with hashed passwords)
// For now, using environment variables or defaults
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || null;

// Default password for 'admin123' - only used if ADMIN_PASSWORD_HASH is not set
// In production, always set ADMIN_PASSWORD_HASH in environment variables
const DEFAULT_PASSWORD = 'admin123';

// =====================================================
// POST /api/auth/login
// Admin login
// =====================================================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Check username
    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    let validPassword = false;

    if (ADMIN_PASSWORD_HASH) {
      // Use bcrypt to compare with stored hash
      validPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    } else {
      // Fall back to plain text comparison for default password (development only!)
      console.warn('⚠️  WARNING: Using default password. Set ADMIN_PASSWORD_HASH in production!');
      validPassword = password === DEFAULT_PASSWORD;
    }

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        username,
        role: 'admin'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      success: true,
      token,
      user: {
        username,
        role: 'admin'
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
});

// =====================================================
// GET /api/auth/verify
// Verify JWT token
// =====================================================
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    res.json({
      success: true,
      user: decoded,
      message: 'Token is valid'
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
});

// =====================================================
// Middleware: Verify Admin Token
// Use this to protect admin routes
// =====================================================
const verifyAdminToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// Non-middleware check: returns true if the request carries a valid admin JWT.
// Useful for routes that change behavior for admins without rejecting public access.
const isAdminRequest = (req) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded?.role === 'admin';
  } catch {
    return false;
  }
};

module.exports = router;
module.exports.verifyAdminToken = verifyAdminToken;
module.exports.isAdminRequest = isAdminRequest;


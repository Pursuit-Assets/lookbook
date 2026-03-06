// Lookbook Backend Server
// Express + PostgreSQL API following test-pilot-server patterns

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { pool } = require('./db/dbConfig');

const app = express();
const PORT = process.env.PORT || 4002; // Default to 4002 to match frontend

// =====================================================
// MIDDLEWARE
// =====================================================

// Enable gzip compression for all responses
app.use(compression({
  // Compress all responses
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  // Compression level (0-9, 6 is default, 9 is best but slowest)
  level: 6
}));

// CORS configuration - more flexible for development
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow any localhost port
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    
    // In production, allow configured frontend URL(s) and Render preview URLs
    const allowedOrigins = process.env.FRONTEND_URL ? 
      process.env.FRONTEND_URL.split(',') : 
      ['http://localhost:5175', 'http://localhost:5176'];
    
    // Also allow any .onrender.com domain in production (for Render deployments)
    if (process.env.NODE_ENV === 'production' && origin && origin.includes('.onrender.com')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log rejected origins in production for debugging
      if (process.env.NODE_ENV === 'production') {
        console.log('CORS rejected origin:', origin);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory (for uploaded images)
// Cache images aggressively in the browser - 7 days
app.use('/uploads', express.static('public/uploads', {
  maxAge: '7d',
  etag: true,
  lastModified: true
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// =====================================================
// ROUTES
// =====================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'lookbook-api'
  });
});

// Test database connection
app.get('/api/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'connected', 
      timestamp: result.rows[0].now 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// Import route modules
const authRouter = require('./routes/auth');
const profilesRouter = require('./routes/profiles');
const projectsRouter = require('./routes/projects');
const searchRouter = require('./routes/search');
const sharepackRouter = require('./routes/sharepack');
const aiRouter = require('./routes/ai');
const claudeRouter = require('./routes/claude');
const taxonomyRouter = require('./routes/taxonomy');
const initiativesRouter = require('./routes/initiatives');
const contactRouter = require('./routes/contact');

// Mount routes
app.use('/api/auth', authRouter);

// Pre-warm cache on startup (for faster initial loads)
async function preWarmCache() {
  const http = require('http');

  // Helper to make a cache-warming request
  const warmRequest = (url, description) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const testRequest = http.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          const warmTime = Date.now() - startTime;
          try {
            const result = JSON.parse(data);
            if (result.success) {
              console.log(`   ✓ ${description} cached in ${warmTime}ms (${result.data?.length || 0} items)`);
            }
          } catch (e) {
            // Ignore parse errors
          }
          resolve();
        });
      });
      testRequest.on('error', () => resolve());
      testRequest.setTimeout(15000, () => {
        testRequest.destroy();
        resolve();
      });
    });
  };

  try {
    console.log('🔥 Pre-warming project cache...');
    const startTime = Date.now();

    // 1. Warm default projects query
    await warmRequest(
      `http://localhost:${PORT}/api/projects?limit=8&offset=0&includeParticipants=false`,
      'Default projects (first page)'
    );

    // 2. Warm initiative cohort filters
    try {
      const { pool } = require('./db/dbConfig');
      const initiativesResult = await pool.query(
        'SELECT DISTINCT cohort_value FROM lookbook_initiatives WHERE is_active = true AND cohort_value IS NOT NULL'
      );

      if (initiativesResult.rows.length > 0) {
        console.log(`   Warming ${initiativesResult.rows.length} initiative cohorts...`);
        for (const row of initiativesResult.rows) {
          const cohort = row.cohort_value;
          await warmRequest(
            `http://localhost:${PORT}/api/projects?limit=8&offset=0&cohort=${encodeURIComponent(cohort)}&includeParticipants=false`,
            `Cohort: ${cohort}`
          );
        }
      }
    } catch (dbErr) {
      console.warn('   ⚠️  Could not warm initiative caches:', dbErr.message);
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Cache pre-warming completed in ${totalTime}ms`);
  } catch (error) {
    console.warn('⚠️  Cache pre-warming failed (non-critical):', error.message);
  }
}

// Pre-warm cache after server starts (don't block startup)
setTimeout(preWarmCache, 3000); // Wait 3 seconds for server to fully start
app.use('/api/profiles', profilesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/search', searchRouter);
app.use('/api/sharepack', sharepackRouter);
app.use('/api/ai', aiRouter);
app.use('/api/claude', claudeRouter);
app.use('/api/taxonomy', taxonomyRouter);
app.use('/api/initiatives', initiativesRouter);
app.use('/api/contact', contactRouter);

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =====================================================
// SERVER START
// =====================================================

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   🚀 Lookbook API Server Running        ║
║                                          ║
║   Port: ${PORT}                            ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║   Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}   ║
║                                          ║
║   Ready to accept requests! 🎉          ║
╚══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});



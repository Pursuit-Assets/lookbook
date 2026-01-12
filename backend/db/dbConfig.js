// Database configuration for PostgreSQL
// Supports both individual connection parameters and DATABASE_URL

require('dotenv').config();
const { Pool } = require('pg');

// Create connection configuration
let dbConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL if provided (Heroku, Railway, etc.)
  const isRemoteDB = process.env.DATABASE_URL.includes('34.57.101.141');
  
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    // Optimized connection pool settings for remote databases
    // Increased pool size to handle concurrent requests better
    max: isRemoteDB ? 25 : 20, // Increased from 10 to 25 for remote to handle concurrent requests
    min: isRemoteDB ? 5 : 0, // Increased from 2 to 5 to keep more connections warm
    idleTimeoutMillis: isRemoteDB ? 60000 : 30000, // Keep connections longer for remote
    connectionTimeoutMillis: isRemoteDB ? 20000 : 10000, // Increased timeout for remote (was 15s)
    // Keep connections alive to reduce overhead
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    // Allow waiting for connections when pool is full (instead of immediate error)
    allowExitOnIdle: false,
  };
  // SSL configuration for hosted databases (Google Cloud SQL requires SSL)
  // Enable SSL for remote databases (including Google Cloud SQL)
  if (isRemoteDB || process.env.NODE_ENV === 'production') {
    dbConfig.ssl = {
      rejectUnauthorized: false
    };
  }
} else {
  // Use individual connection parameters
  dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

// Create connection pool
const pool = new Pool(dbConfig);

// Test connection on startup
pool.on('connect', () => {
  console.log('📊 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

module.exports = { pool };


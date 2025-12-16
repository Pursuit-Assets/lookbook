// Database configuration for PostgreSQL
// Supports both individual connection parameters and DATABASE_URL

require('dotenv').config();
const { Pool } = require('pg');

// Create connection configuration
let dbConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL if provided (Heroku, Railway, etc.)
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    // Connection pool settings for better performance
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
  // SSL configuration for hosted databases
  if (process.env.NODE_ENV === 'production') {
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


#!/usr/bin/env node

/**
 * Setup Verification Script
 * Checks that everything is configured correctly before starting the app
 */

const fs = require('fs');
const path = require('path');

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkItem(name, passed, suggestion = '') {
  if (passed) {
    log(`✅ ${name}`, 'green');
    return true;
  } else {
    log(`❌ ${name}`, 'red');
    if (suggestion) {
      log(`   → ${suggestion}`, 'yellow');
    }
    return false;
  }
}

async function verifySetup() {
  console.log('\n' + '='.repeat(60));
  log('🔍 Lookbook Setup Verification', 'bold');
  console.log('='.repeat(60) + '\n');

  let allGood = true;

  // Check Node.js version
  log('Checking Node.js...', 'cyan');
  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
  allGood &= checkItem(
    `Node.js ${nodeVersion}`,
    nodeMajor >= 16,
    'Install Node.js 16 or higher'
  );

  // Check backend dependencies
  log('\nChecking backend...', 'cyan');
  const backendNodeModules = fs.existsSync(path.join(__dirname, 'node_modules'));
  allGood &= checkItem(
    'Backend dependencies installed',
    backendNodeModules,
    'Run: cd backend && npm install'
  );

  // Check .env file
  const envExists = fs.existsSync(path.join(__dirname, '.env'));
  allGood &= checkItem(
    'Environment file (.env) exists',
    envExists,
    'Run: npm run db:segundo'
  );

  if (envExists) {
    // Load and check .env contents
    require('dotenv').config();
    
    const hasDbUrl = !!process.env.DATABASE_URL;
    allGood &= checkItem(
      'DATABASE_URL configured',
      hasDbUrl,
      'Run: npm run db:segundo'
    );

    const hasPort = !!process.env.PORT;
    allGood &= checkItem(
      'PORT configured',
      hasPort,
      'Add PORT=4002 to .env'
    );

    const hasNodeEnv = !!process.env.NODE_ENV;
    checkItem(
      'NODE_ENV configured',
      hasNodeEnv,
      'Add NODE_ENV=development to .env (optional)'
    );
  }

  // Check frontend
  log('\nChecking frontend...', 'cyan');
  const frontendPath = path.join(__dirname, '..', 'frontend');
  const frontendNodeModules = fs.existsSync(path.join(frontendPath, 'node_modules'));
  allGood &= checkItem(
    'Frontend dependencies installed',
    frontendNodeModules,
    'Run: cd frontend && npm install'
  );

  // Check package.json scripts
  log('\nChecking npm scripts...', 'cyan');
  const packageJson = require('./package.json');
  checkItem('db:check script available', !!packageJson.scripts['db:check']);
  checkItem('db:segundo script available', !!packageJson.scripts['db:segundo']);
  checkItem('dev script available', !!packageJson.scripts['dev']);

  // Test database connection if .env exists
  if (envExists && process.env.DATABASE_URL) {
    log('\nTesting database connection...', 'cyan');
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    });

    try {
      const result = await pool.query('SELECT NOW(), current_database()');
      const { now, current_database } = result.rows[0];
      checkItem(`Connected to database: ${current_database}`, true);
      
      // Check for tables
      const tables = await pool.query(`
        SELECT COUNT(*) as count FROM pg_tables 
        WHERE schemaname = 'public' AND tablename LIKE 'lookbook_%'
      `);
      const tableCount = parseInt(tables.rows[0].count);
      checkItem(
        `Lookbook tables found: ${tableCount}`,
        tableCount > 0,
        'Database may need initialization'
      );

      await pool.end();
    } catch (error) {
      allGood &= checkItem(
        'Database connection',
        false,
        `Error: ${error.message}`
      );
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allGood) {
    log('✅ All checks passed! You\'re ready to start the app.', 'green');
    console.log('\nTo start:');
    log('  Terminal 1: cd backend && npm run dev', 'cyan');
    log('  Terminal 2: cd frontend && npm run dev', 'cyan');
  } else {
    log('⚠️  Some checks failed. Please fix the issues above.', 'yellow');
    console.log('\nFor help, see:');
    log('  - START_HERE.md', 'cyan');
    log('  - DATABASE_CONFIG.md', 'cyan');
    log('  - STARTUP_CHECKLIST.md', 'cyan');
  }
  console.log('='.repeat(60) + '\n');

  process.exit(allGood ? 0 : 1);
}

verifySetup().catch(error => {
  log(`\n❌ Verification failed: ${error.message}`, 'red');
  process.exit(1);
});


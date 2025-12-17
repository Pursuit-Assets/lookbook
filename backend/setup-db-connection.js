#!/usr/bin/env node

/**
 * Database Connection Setup Script
 * 
 * This script helps you quickly set up and test database connections.
 * Run with: node setup-db-connection.js [profile]
 * 
 * Profiles:
 *   segundo  - Connect to segundo-db (production)
 *   local    - Connect to local PostgreSQL
 *   custom   - Prompt for custom connection details
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Predefined connection profiles
const profiles = {
  segundo: {
    name: 'Segundo Database (Production)',
    url: 'postgresql://lookbook_user_new:qc34bfs2efegboo1@34.57.101.141:5432/segundo-db',
    port: 4002,
    frontendPort: 5175, // Note: CORS allows any localhost port in development
  },
  local: {
    name: 'Local Development Database',
    url: 'postgresql://postgres:postgres@localhost:5432/lookbook',
    port: 4002,
    frontendPort: 5173,
  },
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'bright');
  console.log('='.repeat(60) + '\n');
}

async function testConnection(connectionUrl) {
  log('🔍 Testing database connection...', 'cyan');
  
  const pool = new Pool({
    connectionString: connectionUrl,
    connectionTimeoutMillis: 5000,
  });

  try {
    // Test basic connection
    const result = await pool.query('SELECT NOW(), current_database(), current_user');
    const { now, current_database, current_user } = result.rows[0];
    
    log('✅ Connection successful!', 'green');
    log(`⏰ Server time: ${now}`, 'blue');
    log(`🗄️  Database: ${current_database}`, 'blue');
    log(`👤 User: ${current_user}`, 'blue');
    
    // Check for lookbook tables
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE 'lookbook_%'
      ORDER BY tablename
    `);
    
    log(`\n📊 Lookbook Tables Found: ${tables.rows.length}`, 'cyan');
    if (tables.rows.length > 0) {
      tables.rows.forEach(row => log(`  - ${row.tablename}`, 'blue'));
    } else {
      log('⚠️  No lookbook tables found. Database may need initialization.', 'yellow');
    }
    
    // Get record counts
    try {
      const profileCount = await pool.query('SELECT COUNT(*) FROM lookbook_profiles');
      const projectCount = await pool.query('SELECT COUNT(*) FROM lookbook_projects');
      const skillsCount = await pool.query('SELECT COUNT(*) FROM lookbook_skills');
      const industriesCount = await pool.query('SELECT COUNT(*) FROM lookbook_industries');
      
      log('\n📈 Record Counts:', 'cyan');
      log(`  - Profiles: ${profileCount.rows[0].count}`, 'blue');
      log(`  - Projects: ${projectCount.rows[0].count}`, 'blue');
      log(`  - Skills: ${skillsCount.rows[0].count}`, 'blue');
      log(`  - Industries: ${industriesCount.rows[0].count}`, 'blue');
    } catch (e) {
      log('\n⚠️  Could not fetch record counts (tables may not exist yet)', 'yellow');
    }
    
    await pool.end();
    return true;
  } catch (error) {
    log('❌ Connection failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    
    log('\n💡 Common Issues:', 'yellow');
    log('  1. Check that the database server is running', 'yellow');
    log('  2. Verify the connection string is correct', 'yellow');
    log('  3. Check firewall/network settings', 'yellow');
    log('  4. Ensure user has proper permissions', 'yellow');
    
    try {
      await pool.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    return false;
  }
}

function createEnvFile(profile, envPath) {
  const config = profiles[profile];
  
  const envContent = `# Lookbook Backend Environment Configuration
# Generated: ${new Date().toISOString()}
# Profile: ${config.name}

PORT=${config.port}
NODE_ENV=development

# Frontend URL - In development, CORS allows any localhost port
# In production, set this to your actual frontend URL
FRONTEND_URL=http://localhost:${config.frontendPort}

# Database Connection
DATABASE_URL=${config.url}

# Admin Authentication (Optional - uncomment and configure)
# ADMIN_USERNAME=admin
# ADMIN_PASSWORD_HASH=
# JWT_SECRET=your-secret-key-change-this-in-production
# JWT_EXPIRY=7d

# AI Features (Optional)
# OPENAI_API_KEY=

# CRM Integration (Optional)
# CRM_WEBHOOK_URL=
# CRM_WEBHOOK_AUTH=
`;

  fs.writeFileSync(envPath, envContent);
  log(`✅ Created ${envPath}`, 'green');
}

async function setupProfile(profileName) {
  logHeader(`🚀 Setting up Lookbook with ${profileName} profile`);
  
  const profile = profiles[profileName];
  if (!profile) {
    log(`❌ Unknown profile: ${profileName}`, 'red');
    log('Available profiles: segundo, local', 'yellow');
    process.exit(1);
  }
  
  log(`📝 Profile: ${profile.name}`, 'cyan');
  log(`🔗 Database: ${profile.url.replace(/:[^:@]+@/, ':****@')}`, 'cyan');
  log(`🔌 Backend Port: ${profile.port}`, 'cyan');
  log(`🌐 Frontend Port: ${profile.frontendPort}`, 'cyan');
  
  // Test connection first
  logHeader('Testing Database Connection');
  const connected = await testConnection(profile.url);
  
  if (!connected) {
    log('\n❌ Cannot proceed with setup - database connection failed', 'red');
    process.exit(1);
  }
  
  // Create .env file
  logHeader('Creating Environment Configuration');
  const envPath = path.join(__dirname, '.env');
  createEnvFile(profileName, envPath);
  
  // Success summary
  logHeader('✅ Setup Complete!');
  log('Your environment is ready. To start the application:', 'green');
  log('\n1. Start the backend:', 'cyan');
  log('   cd backend && npm run dev', 'blue');
  log('\n2. In a new terminal, start the frontend:', 'cyan');
  log('   cd frontend && npm run dev', 'blue');
  log('\n3. Open your browser to:', 'cyan');
  log(`   http://localhost:${profile.frontendPort}`, 'blue');
  
  log('\n📚 Additional Commands:', 'cyan');
  log('   npm run db:check     - Test database connection', 'blue');
  log('   npm run db:segundo   - Switch to segundo database', 'blue');
  log('   npm run db:local     - Switch to local database', 'blue');
}

async function quickCheck() {
  logHeader('🔍 Quick Database Connection Check');
  
  // Check if .env exists
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    log('❌ No .env file found!', 'red');
    log('\nRun one of these commands to set up:', 'yellow');
    log('  node setup-db-connection.js segundo', 'blue');
    log('  node setup-db-connection.js local', 'blue');
    process.exit(1);
  }
  
  // Load .env and test connection
  require('dotenv').config();
  
  if (!process.env.DATABASE_URL) {
    log('❌ DATABASE_URL not set in .env file', 'red');
    process.exit(1);
  }
  
  log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`, 'cyan');
  
  await testConnection(process.env.DATABASE_URL);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'check') {
    await quickCheck();
  } else if (profiles[command]) {
    await setupProfile(command);
  } else {
    logHeader('🔧 Lookbook Database Setup Tool');
    log('Usage: node setup-db-connection.js [command]', 'cyan');
    log('\nCommands:', 'yellow');
    log('  check          - Test current database connection', 'blue');
    log('  segundo        - Set up segundo database (production)', 'blue');
    log('  local          - Set up local database', 'blue');
    log('\nExamples:', 'yellow');
    log('  node setup-db-connection.js segundo', 'blue');
    log('  node setup-db-connection.js check', 'blue');
  }
}

main().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});


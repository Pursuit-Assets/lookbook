// Script to grant permissions to lookbook_user_new
// Run this with admin/superuser database credentials

require('dotenv').config();
const { Pool } = require('pg');

// You can either:
// 1. Set POSTGRES_ADMIN_URL in .env with postgres user credentials
// 2. Or modify DATABASE_URL temporarily to use postgres user
// 3. Or pass credentials via command line

const adminUrl = process.env.POSTGRES_ADMIN_URL || process.env.DATABASE_URL;

if (!adminUrl) {
  console.error('❌ No database connection URL found');
  console.error('Please set POSTGRES_ADMIN_URL or DATABASE_URL in .env');
  process.exit(1);
}

// Parse the URL to check if it's using postgres user
const urlMatch = adminUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (urlMatch) {
  const dbUser = urlMatch[1];
  console.log('Connecting as user:', dbUser);
  
  if (dbUser !== 'postgres' && !dbUser.includes('admin')) {
    console.warn('⚠️  Warning: Not connecting as postgres user');
    console.warn('⚠️  You may need admin credentials to grant permissions');
  }
}

const pool = new Pool({
  connectionString: adminUrl
});

async function grantPermissions() {
  try {
    console.log('🔐 Attempting to grant permissions...');
    
    // Grant INSERT permission
    await pool.query('GRANT INSERT ON TABLE public.users TO lookbook_user_new');
    console.log('✅ Granted INSERT permission');
    
    // Grant UPDATE permission
    await pool.query('GRANT UPDATE ON TABLE public.users TO lookbook_user_new');
    console.log('✅ Granted UPDATE permission');
    
    // Verify permissions
    const result = await pool.query(`
      SELECT 
        has_table_privilege('lookbook_user_new', 'public.users', 'INSERT') as can_insert,
        has_table_privilege('lookbook_user_new', 'public.users', 'UPDATE') as can_update
    `);
    
    console.log('');
    console.log('📊 Verification:');
    console.log('  INSERT permission:', result.rows[0].can_insert ? '✅ GRANTED' : '❌ NOT GRANTED');
    console.log('  UPDATE permission:', result.rows[0].can_update ? '✅ GRANTED' : '❌ NOT GRANTED');
    
    if (result.rows[0].can_insert && result.rows[0].can_update) {
      console.log('');
      console.log('🎉 Success! Permissions have been granted.');
      console.log('You can now create profiles and update user names.');
    } else {
      console.log('');
      console.log('⚠️  Permissions were not granted. You may need to:');
      console.log('  1. Connect as postgres user or superuser');
      console.log('  2. Check that you have GRANT privileges');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.code, error.message);
    if (error.code === '42501') {
      console.error('');
      console.error('Permission denied. You need to:');
      console.error('  1. Connect as postgres user or superuser');
      console.error('  2. Or have GRANT privileges on the users table');
      console.error('');
      console.error('To connect as postgres, modify your DATABASE_URL to use postgres user:');
      console.error('  postgresql://postgres:PASSWORD@34.57.101.141:5432/segundo-db');
    }
  } finally {
    await pool.end();
  }
}

grantPermissions();


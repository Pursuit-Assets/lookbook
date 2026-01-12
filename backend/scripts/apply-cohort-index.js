// Script to apply the cohort filtering performance index
// Uses the existing database configuration from dbConfig.js

const fs = require('fs');
const path = require('path');
const { pool } = require('../db/dbConfig');

async function applyMigration() {
  const migrationFile = path.join(__dirname, '../../database/migrations/add_cohort_filtering_index.sql');
  
  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Migration file not found: ${migrationFile}`);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(migrationFile, 'utf8');
  
  console.log('🚀 Applying cohort filtering performance index...\n');
  console.log('📄 Reading migration file:', migrationFile);
  console.log('');
  
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connected to database');
    console.log('📊 Executing migration...\n');
    
    // Execute the migration
    await client.query(sql);
    
    console.log('✅ Migration applied successfully!\n');
    
    // Verify indexes were created
    console.log('📊 Verifying indexes...\n');
    const result = await client.query(`
      SELECT 
        indexname, 
        indexdef 
      FROM pg_indexes 
      WHERE tablename = 'lookbook_projects' 
        AND (indexname LIKE '%cohort%' OR indexname LIKE '%status%cohort%')
      ORDER BY indexname;
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Found indexes:');
      result.rows.forEach(row => {
        console.log(`   - ${row.indexname}`);
      });
    } else {
      console.log('⚠️  No cohort-related indexes found (this might be normal if they have different names)');
    }
    
    console.log('\n🎯 Expected indexes:');
    console.log('   - idx_lookbook_projects_status_cohort_created');
    console.log('   - idx_lookbook_projects_active_cohort_created');
    console.log('   - idx_lookbook_projects_cohort (existing)');
    console.log('\n✨ Done! SMB filtering should now be much faster.');
    
  } catch (error) {
    console.error('\n❌ Error applying migration:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
applyMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

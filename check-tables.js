const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '34.121.71.230',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'Shivtest@135',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkTables() {
  try {
    console.log('Checking existing tables...');
    
    // List all tables in the database
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\nExisting tables:');
    if (result.rows.length === 0) {
      console.log('No tables found in the database.');
    } else {
      result.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }
    
    // Check specific tables we need
    const requiredTables = ['users', 'user_quotas', 'english_assessments', 'english_analysis_requests', 'career_surveys'];
    console.log('\nChecking required tables:');
    
    for (const table of requiredTables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`✓ ${table}: ${countResult.rows[0].count} rows`);
      } catch (error) {
        console.log(`✗ ${table}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    await pool.end();
  }
}

checkTables(); 
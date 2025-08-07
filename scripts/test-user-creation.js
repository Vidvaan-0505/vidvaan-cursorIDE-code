const { Pool } = require('pg');

// Initialize PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '34.121.71.230',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'Shivtest@135',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testUserCreation() {
  const client = await pool.connect();
  
  try {
    console.log('Testing user creation system...\n');
    
    // Check if tables exist
    console.log('1. Checking if tables exist...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_quotas')
      ORDER BY table_name
    `);
    
    console.log('Found tables:', tablesResult.rows.map(row => row.table_name));
    
    // Check current user count
    console.log('\n2. Checking current user count...');
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    const quotaCount = await client.query('SELECT COUNT(*) as count FROM user_quotas');
    
    console.log(`Users table: ${userCount.rows[0].count} records`);
    console.log(`User quotas table: ${quotaCount.rows[0].count} records`);
    
    // Check for users without quotas
    console.log('\n3. Checking for users without quotas...');
    const usersWithoutQuotas = await client.query(`
      SELECT u.firebase_uid, u.email 
      FROM users u 
      LEFT JOIN user_quotas q ON u.firebase_uid = q.user_id 
      WHERE q.user_id IS NULL
    `);
    
    if (usersWithoutQuotas.rows.length > 0) {
      console.log('Users without quotas:');
      usersWithoutQuotas.rows.forEach(user => {
        console.log(`  - ${user.email} (${user.firebase_uid})`);
      });
    } else {
      console.log('All users have quotas ✓');
    }
    
    // Check for quotas without users
    console.log('\n4. Checking for orphaned quotas...');
    const orphanedQuotas = await client.query(`
      SELECT q.user_id, q.user_email 
      FROM user_quotas q 
      LEFT JOIN users u ON q.user_id = u.firebase_uid 
      WHERE u.firebase_uid IS NULL
    `);
    
    if (orphanedQuotas.rows.length > 0) {
      console.log('Orphaned quotas:');
      orphanedQuotas.rows.forEach(quota => {
        console.log(`  - ${quota.user_email} (${quota.user_id})`);
      });
    } else {
      console.log('No orphaned quotas ✓');
    }
    
    // Show sample data
    console.log('\n5. Sample user data:');
    const sampleUsers = await client.query(`
      SELECT u.firebase_uid, u.email, u.phone, u.created_at,
             q.english_analysis_quota, q.career_survey_quota
      FROM users u 
      LEFT JOIN user_quotas q ON u.firebase_uid = q.user_id 
      ORDER BY u.created_at DESC 
      LIMIT 5
    `);
    
    if (sampleUsers.rows.length > 0) {
      sampleUsers.rows.forEach(user => {
        console.log(`  - ${user.email} (${user.firebase_uid})`);
        console.log(`    Phone: ${user.phone || 'Not provided'}`);
        console.log(`    Created: ${user.created_at}`);
        console.log(`    English quota: ${user.english_analysis_quota || 'No quota'}`);
        console.log(`    Career quota: ${user.career_survey_quota || 'No quota'}`);
        console.log('');
      });
    } else {
      console.log('No users found in database');
    }
    
    console.log('Test completed!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testUserCreation()
    .then(() => {
      console.log('Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testUserCreation };

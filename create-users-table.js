const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '34.121.71.230',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'Shivtest@135',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: {
    rejectUnauthorized: false,
    ca: undefined,
    key: undefined,
    cert: undefined
  },
  // Add connection parameters to fix protocol issue
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
  // Force protocol version
  application_name: 'vidvaan-attempt-2'
});

async function createUsersTable() {
  try {
    console.log('Creating users table...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
    
    console.log('✓ Users table created successfully!');
    
    // Verify the table exists
    const result = await pool.query('SELECT COUNT(*) FROM users;');
    console.log(`✓ Users table has ${result.rows[0].count} rows`);
    
  } catch (error) {
    console.error('Error creating users table:', error);
  } finally {
    await pool.end();
  }
}

createUsersTable(); 
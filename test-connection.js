const { Pool } = require('pg');

// Simple connection test
const pool = new Pool({
  user: 'postgres',
  host: '34.121.71.230',
  database: 'postgres',
  password: 'Shivtest@135',
  port: 5432,
  ssl: false, // Try without SSL first
  connectionTimeoutMillis: 5000
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    const client = await pool.connect();
    console.log('✓ Connected successfully!');
    
    // Test a simple query
    const result = await client.query('SELECT version();');
    console.log('✓ PostgreSQL version:', result.rows[0].version);
    
    // List tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\nExisting tables:');
    if (tables.rows.length === 0) {
      console.log('No tables found.');
    } else {
      tables.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }
    
    client.release();
    
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    
    // Try with SSL if first attempt failed
    if (!error.message.includes('SSL')) {
      console.log('\nTrying with SSL...');
      const sslPool = new Pool({
        user: 'postgres',
        host: '34.121.71.230',
        database: 'postgres',
        password: 'Shivtest@135',
        port: 5432,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      });
      
      try {
        const sslClient = await sslPool.connect();
        console.log('✓ Connected with SSL!');
        sslClient.release();
      } catch (sslError) {
        console.error('✗ SSL connection also failed:', sslError.message);
      } finally {
        await sslPool.end();
      }
    }
  } finally {
    await pool.end();
  }
}

testConnection(); 
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase-admin';
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '34.121.71.230',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'Shivtest@135',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Helper function to verify Firebase token
async function verifyToken(authHeader: string | null): Promise<any> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid authorization header');
  }

  const token = authHeader.substring(7);
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid token');
  }
}

// POST: Create user in PostgreSQL database
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyToken(authHeader);
    
    const { phone } = await request.json();
    const userId = decodedToken.uid;
    const email = decodedToken.email;

    if (!email) {
      return NextResponse.json({ error: 'Email not found in token' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE firebase_uid = $1',
        [userId]
      );

      if (existingUser.rows.length > 0) {
        return NextResponse.json({ 
          message: 'User already exists',
          userId: userId 
        });
      }

      // Create user in PostgreSQL
      const userResult = await client.query(
        `INSERT INTO users (firebase_uid, email, phone, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id, firebase_uid, email, phone, created_at`,
        [userId, email, phone || null]
      );

      // Create default quota for the user (100 for testing, will change to 10 later)
      await client.query(
        `INSERT INTO user_quotas (user_id, user_email, english_analysis_quota, career_survey_quota, premium_modules_quota)
         VALUES ($1, $2, 100, 5, 0)`,
        [userId, email]
      );

      return NextResponse.json({
        success: true,
        message: 'User created successfully',
        user: userResult.rows[0]
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

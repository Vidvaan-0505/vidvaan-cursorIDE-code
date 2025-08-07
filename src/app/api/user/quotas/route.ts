import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Pool } from 'pg';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase Admin SDK configuration');
    console.error('FIREBASE_PROJECT_ID:', !!projectId);
    console.error('FIREBASE_CLIENT_EMAIL:', !!clientEmail);
    console.error('FIREBASE_PRIVATE_KEY:', !!privateKey);
    throw new Error('Firebase Admin SDK configuration incomplete');
  }

  initializeApp({
    credential: cert({
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: privateKey,
    }),
  });
  console.log('Firebase Admin SDK initialized successfully in quotas');
} else {
  console.log('Firebase Admin SDK already initialized in quotas');
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Helper function to verify Firebase token
async function verifyToken(authHeader: string | null): Promise<string> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid authorization header');
  }

  const token = authHeader.substring(7);
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid token');
  }
}

// GET: Get user quotas
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const userId = await verifyToken(authHeader);

    const client = await pool.connect();
    try {
      // Get user quotas
      const result = await client.query(
        'SELECT * FROM user_quotas WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        // Create default quota record for new user
        const userResult = await client.query(
          'SELECT email FROM users WHERE firebase_uid = $1',
          [userId]
        );

        if (userResult.rows.length === 0) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userEmail = userResult.rows[0].email;
        const insertResult = await client.query(
          `INSERT INTO user_quotas (user_id, user_email, english_analysis_quota, career_survey_quota, premium_modules_quota)
           VALUES ($1, $2, 100, 5, 0)
           RETURNING *`,
          [userId, userEmail]
        );

        return NextResponse.json(insertResult.rows[0]);
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting user quotas:', error);
    return NextResponse.json(
      { error: 'Failed to get user quotas' },
      { status: 500 }
    );
  }
}

// POST: Update user quotas (for admin use or purchases)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const userId = await verifyToken(authHeader);
    const body = await request.json();
    const { english_analysis_quota, career_survey_quota, premium_modules_quota } = body;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE user_quotas 
         SET english_analysis_quota = COALESCE($1, english_analysis_quota),
             career_survey_quota = COALESCE($2, career_survey_quota),
             premium_modules_quota = COALESCE($3, premium_modules_quota),
             updated_at = NOW()
         WHERE user_id = $4
         RETURNING *`,
        [english_analysis_quota, career_survey_quota, premium_modules_quota, userId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'User quota not found' }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating user quotas:', error);
    return NextResponse.json(
      { error: 'Failed to update user quotas' },
      { status: 500 }
    );
  }
} 
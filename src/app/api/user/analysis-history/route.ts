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
  console.log('Firebase Admin SDK initialized successfully in analysis-history');
} else {
  console.log('Firebase Admin SDK already initialized in analysis-history');
}

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

// GET: Get user's analysis history
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyToken(authHeader);

    const client = await pool.connect();
    const userId = decodedToken.uid;
    const email = decodedToken.email;
    
    try {
      // Get user's analysis history
      const result = await client.query(
        `SELECT 
          request_id,
          input_text,
          gcs_file_path,
          request_processed,
          assessed_level,
          created_at,
          processed_at,
          expires_at
         FROM english_analysis_requests 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );

      return NextResponse.json({
        analyses: result.rows,
        total: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting analysis history:', error);
    return NextResponse.json(
      { error: 'Failed to get analysis history' },
      { status: 500 }
    );
  }
} 
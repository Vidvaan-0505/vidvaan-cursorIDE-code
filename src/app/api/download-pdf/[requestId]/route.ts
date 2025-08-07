import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Pool } from 'pg';

// Initialize Firebase Admin SDK
let firebaseApp: any;
try {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.error('Missing Firebase Admin SDK configuration');
      throw new Error('Firebase Admin SDK configuration incomplete');
    }
    firebaseApp = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else {
    firebaseApp = getApps()[0];
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  throw error;
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

// GET: Get signed URL for PDF download
export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const userId = await verifyToken(authHeader);
    const { requestId } = params;

    const client = await pool.connect();
    try {
      // Verify the request belongs to the user and is processed
      const result = await client.query(
        `SELECT gcs_file_path, gcs_bucket, request_processed, expires_at
         FROM english_analysis_requests 
         WHERE request_id = $1 AND user_id = $2`,
        [requestId, userId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
      }

      const analysis = result.rows[0];

      if (analysis.request_processed !== 'yes') {
        return NextResponse.json({ 
          error: 'Analysis not yet processed',
          status: analysis.request_processed 
        }, { status: 400 });
      }

      if (analysis.expires_at && new Date(analysis.expires_at) < new Date()) {
        return NextResponse.json({ error: 'PDF has expired' }, { status: 410 });
      }

      if (!analysis.gcs_file_path) {
        return NextResponse.json({ error: 'PDF not available' }, { status: 404 });
      }

      // For now, return the GCS path
      // In production, you would generate a signed URL here
      // This will be handled by your Python backend
      return NextResponse.json({
        downloadUrl: analysis.gcs_file_path,
        bucket: analysis.gcs_bucket,
        expiresAt: analysis.expires_at
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting PDF download URL:', error);
    return NextResponse.json(
      { error: 'Failed to get download URL' },
      { status: 500 }
    );
  }
} 
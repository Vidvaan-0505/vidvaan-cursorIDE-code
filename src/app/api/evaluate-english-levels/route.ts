import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
let firebaseApp: any;
try {
  if (!getApps().length) {
    // Use environment variables directly (Firebase Functions v2)
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

    firebaseApp = initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey,
      }),
    });
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    firebaseApp = getApps()[0];
    console.log('Firebase Admin SDK already initialized');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  throw error;
}

// PostgreSQL connection (you'll need to install pg package)
// npm install pg @types/pg
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Helper function to check user quota
async function checkUserQuota(userId: string): Promise<{ hasQuota: boolean; currentQuota: number }> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT english_analysis_quota FROM user_quotas WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // User doesn't have a quota record - they should have been created during signup/login
      // Return no quota to force them to sign up properly
      return { hasQuota: false, currentQuota: 0 };
    }

    const currentQuota = result.rows[0].english_analysis_quota;
    return { hasQuota: currentQuota > 0, currentQuota };
  } finally {
    client.release();
  }
}

// Helper function to decrement user quota
async function decrementUserQuota(userId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      'UPDATE user_quotas SET english_analysis_quota = english_analysis_quota - 1 WHERE user_id = $1',
      [userId]
    );
  } finally {
    client.release();
  }
}

// Helper function to save request with status
async function saveRequestWithStatus(
  userId: string,
  userEmail: string,
  inputText: string,
  requestId: string,
  timestamp: string,
  status: 'yes' | 'no' | 'quota_exceeded' | 'failed'
): Promise<any> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO english_analysis_requests 
       (user_id, user_email, input_text, request_id, created_at, request_processed, assessed_level)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
       RETURNING id`,
      [userId, userEmail, inputText, requestId, timestamp, status]
    );
    return result;
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the Firebase token
    let decodedToken;
    try {
      const auth = getAuth(firebaseApp);
      decodedToken = await auth.verifyIdToken(token);
      console.log('Token verified successfully for user:', decodedToken.uid);
    } catch (error: any) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ 
        error: 'Invalid token', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'Authentication failed' 
      }, { status: 401 });
    }

    const { text, userId, userEmail, requestId, timestamp } = await request.json();

    if (!text || !userId || !userEmail || !requestId || !timestamp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check user quota first
    try {
      const quotaCheck = await checkUserQuota(userId);
      
      if (!quotaCheck.hasQuota) {
        // Save request with quota_exceeded status
        await saveRequestWithStatus(userId, userEmail, text, requestId, timestamp, 'quota_exceeded');
        
        return NextResponse.json({
          success: false,
          error: 'No quota available',
          message: quotaCheck.currentQuota === 0 
            ? 'Please sign up or log in to get your free English analysis quota.'
            : 'You have exceeded your English analysis quota. Please purchase more credits.',
          remainingQuota: 0,
          requestId: requestId
        }, { status: 429 });
      }

      // Decrement quota and save request
      await decrementUserQuota(userId);
      const result = await saveRequestWithStatus(userId, userEmail, text, requestId, timestamp, 'no');
      
      return NextResponse.json({
        success: true,
        assessmentId: result.rows[0].id,
        requestId: requestId,
        message: 'Text submitted successfully. Processing will be done by background listener.',
        remainingQuota: quotaCheck.currentQuota - 1,
        timestamps: {
          client: timestamp,
          server: new Date().toISOString()
        }
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed. Please try again later.',
        requestId: requestId
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in evaluate_english_levels:', error);
    
    // Try to save the failed request if we have the data
    try {
      const { text, userId, userEmail, requestId, timestamp } = await request.json();
      if (text && userId && userEmail && requestId && timestamp) {
        await saveRequestWithStatus(userId, userEmail, text, requestId, timestamp, 'failed');
      }
    } catch (saveError) {
      console.error('Failed to save error record:', saveError);
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
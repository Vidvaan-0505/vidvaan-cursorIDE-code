import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK only once
let firebaseApp: any;

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase Admin SDK configuration');
    throw new Error('Firebase Admin SDK configuration incomplete');
  }

  firebaseApp = initializeApp({ 
    credential: cert({ 
      projectId, 
      clientEmail, 
      privateKey 
    }) 
  });
  console.log('Firebase Admin SDK initialized successfully');
} else {
  firebaseApp = getApps()[0];
  console.log('Firebase Admin SDK already initialized');
}

export { firebaseApp, getAuth };

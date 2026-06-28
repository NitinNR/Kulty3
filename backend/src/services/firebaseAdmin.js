import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let firebaseAuth = null;

const initFirebase = () => {
  if (firebaseAuth) return firebaseAuth;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error(
      `Firebase credentials missing: PROJECT_ID=${!!projectId} CLIENT_EMAIL=${!!clientEmail} PRIVATE_KEY=${!!privateKey}`
    );
  }

  const apps = getApps();
  if (apps.length === 0) {
    initializeApp({
      credential: cert({ projectId, privateKey, clientEmail }),
    });
    console.log('✓ Firebase Admin initialized for project:', projectId);
  }

  firebaseAuth = getAuth();
  return firebaseAuth;
};

export const verifyIdToken = async (token) => {
  try {
    const auth = initFirebase();
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    throw new Error('Invalid token');
  }
};

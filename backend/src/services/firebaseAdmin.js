import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import logger from '../config/logger.js';

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
    logger.info('Firebase Admin initialized for project:', projectId);
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
    logger.error('Token verification failed:', { error: error.message, stack: error.stack });
    throw new Error('Invalid token');
  }
};

// Mints a Firebase custom token so a non-Firebase sign-in (e.g. MSG91 phone OTP)
// can be exchanged for a real Firebase session on the client.
export const createCustomToken = async (uid, claims = {}) => {
  try {
    const auth = initFirebase();
    const token = await auth.createCustomToken(uid, claims);
    return token;
  } catch (error) {
    logger.error('Custom token creation failed:', { error: error.message, stack: error.stack });
    throw new Error('Failed to create custom token');
  }
};

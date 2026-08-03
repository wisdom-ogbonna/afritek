/**
 * Firebase Admin SDK configuration and initialization
 */
const admin = require('firebase-admin');
const logger = require('../utils/logger');

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 * Supports both environment variables and GOOGLE_APPLICATION_CREDENTIALS
 */
const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey) {
      // Handle escaped newlines in .env
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (projectId && clientEmail && privateKey) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      logger.info('Firebase Admin SDK initialized with service account credentials');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      logger.info('Firebase Admin SDK initialized with application default credentials');
    } else {
      throw new Error(
        'Firebase credentials not found. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS.'
      );
    }

    return firebaseApp;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', { error: error.message });
    throw error;
  }
};

/**
 * Get Firestore instance
 */
const getFirestore = () => {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.firestore();
};

/**
 * Get Auth instance
 */
const getAuth = () => {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.auth();
};

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth,
  admin,
};

import * as admin from 'firebase-admin';

const requiredAdminVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
];

requiredAdminVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.warn(`⚠️ [FIREBASE ADMIN CONFIG WARNING] Missing environment variable: ${envVar}`);
  }
});

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.includes('-----BEGIN PRIVATE KEY-----')) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
      });
    } else {
      // In Firebase App Hosting, Application Default Credentials (ADC) are automatically available
      admin.initializeApp({
         projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  } catch (error) {
    console.error('❌ Firebase admin initialization error', error);
  }
}

const adminApp = admin.apps.length ? admin.apps[0] : null;
const adminDb = admin.apps.length ? admin.firestore() : null as any;
const adminAuth = admin.apps.length ? admin.auth() : null as any;
const adminStorage = admin.apps.length ? admin.storage() : null as any;

export { adminApp, adminDb, adminAuth, adminStorage };

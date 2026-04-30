import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

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

let adminApp: admin.app.App | null = null;

if (!admin.apps.length) {
  try {
    const hasFullConfig = 
      process.env.FIREBASE_PROJECT_ID && 
      process.env.FIREBASE_CLIENT_EMAIL && 
      process.env.FIREBASE_PRIVATE_KEY &&
      !process.env.FIREBASE_CLIENT_EMAIL.includes('xxxxx') &&
      !process.env.FIREBASE_PRIVATE_KEY.includes('...');

    if (hasFullConfig) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
      });
      console.log("✅ Firebase Admin initialized with Service Account.");
    } else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NODE_ENV === 'production') {
      // In Firebase App Hosting production, ADC should work
      adminApp = admin.initializeApp({
         projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      console.log("✅ Firebase Admin initialized with ADC.");
    } else {
      console.warn("⚠️ Firebase Admin skipped initialization (No valid config).");
    }
  } catch (error) {
    console.error('❌ Firebase admin initialization error', error);
  }
} else {
  adminApp = admin.apps[0];
}

const adminDb = adminApp ? getFirestore(adminApp, 'solgine') : null as any;
const adminAuth = adminApp ? getAuth(adminApp) : null as any;
const adminStorage = adminApp ? getStorage(adminApp) : null as any;

export { admin, adminApp, adminDb, adminAuth, adminStorage };

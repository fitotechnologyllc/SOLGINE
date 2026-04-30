import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: any;
const apps = getApps();

if (apps.length > 0) {
  app = apps[0];
} else {
  // Validate config
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0 && typeof window !== 'undefined') {
    console.error("❌ [SOLGINE] Missing Firebase Config Keys:", missingKeys);
  }
  
  app = initializeApp(firebaseConfig);
}

const auth = getAuth(app);

// Initialize Firestore for 'solgine' database instance
let db: any;
try {
  // Using the more stable getFirestore for named database instead of initializeFirestore with persistence
  // We'll let Firestore handle internal caching by default
  db = getFirestore(app, 'solgine');
  if (typeof window !== 'undefined') {
    console.log("✅ [SOLGINE] Firestore connected to 'solgine' database instance.");
  }
} catch (e) {
  console.error("❌ [SOLGINE] Firestore Init Error:", e);
  // Fallback to default database if 'solgine' fails
  db = getFirestore(app);
}

const storage = getStorage(app);
const functions = getFunctions(app);

export { app, auth, db, storage, functions };

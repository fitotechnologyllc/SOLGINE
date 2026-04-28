'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, limit, query, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, deleteObject } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { db, storage, auth } from '@/lib/firebase';
import toast from 'react-hot-toast';

export function FirebaseConnectionCheck() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let retryTimeout: NodeJS.Timeout;

    const runChecks = async () => {
      try {
        console.log("🔄 Starting Firebase Connection Checks...");
        
        // 1. Check Env Vars (already checked in lib/firebase.ts, but let's confirm here for the UI)
        if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
          throw new Error("Missing Firebase Project ID in environment variables");
        }

        // 2. Check Auth Connection
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Auth timeout")), 5000);
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            clearTimeout(timeout);
            console.log("✅ Firebase Auth connected. User:", user ? user.uid : "No user (unauthenticated)");
            unsubscribe();
            resolve(true);
          }, (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        // 3. Test Firestore Read (boosterPacks)
        const packsRef = collection(db, 'boosterPacks');
        const packsQuery = query(packsRef, limit(1));
        await getDocs(packsQuery);
        console.log("✅ Firestore Read successful (boosterPacks)");

        // 3a. Test Firestore Read (cards)
        const cardsRef = collection(db, 'cards');
        const cardsQuery = query(cardsRef, limit(1));
        await getDocs(cardsQuery);
        console.log("✅ Firestore Read successful (cards)");

        // 3b. Ensure required collections exist (in development)
        if (process.env.NODE_ENV === 'development') {
          const requiredCollections = ['boosterPacks', 'cards', 'playerCollections', 'packOpenings', 'marketListings', 'transactions'];
          for (const colName of requiredCollections) {
            const colRef = collection(db, colName);
            const colSnapshot = await getDocs(query(colRef, limit(1)));
            if (colSnapshot.empty) {
              console.log(`⚠️ Collection '${colName}' is empty. Creating initial document...`);
              await addDoc(colRef, { _init: true, timestamp: serverTimestamp() });
              console.log(`✅ Collection '${colName}' initialized.`);
            }
          }
        }

        // 4. Test Firestore Write (packOpenings)
        const packOpeningsRef = collection(db, 'packOpenings');
        const testDocRef = await addDoc(packOpeningsRef, {
          isTest: true,
          timestamp: serverTimestamp(),
          message: "Firebase connection test"
        });
        console.log("✅ Firestore Write successful (packOpenings)");
        
        // Clean up test document
        await deleteDoc(testDocRef);
        console.log("✅ Firestore Delete successful (test doc cleanup)");

        // 5. Test Storage Upload
        const testStorageRef = ref(storage, 'test/connection-test.txt');
        await uploadString(testStorageRef, 'Connection test successful');
        console.log("✅ Firebase Storage upload successful");
        
        // Clean up test file
        await deleteObject(testStorageRef);
        console.log("✅ Firebase Storage delete successful");

        console.log("Firestore connected");
        console.log("🚀 All Firebase connections verified successfully!");
        setIsChecking(false);

      } catch (error: any) {
        console.error("❌ Firebase Connection Error:", error);
        toast.error("Unable to connect to database — retrying...", { id: 'firebase-error', duration: 4000 });
        
        // Retry connection automatically
        retryTimeout = setTimeout(() => {
          runChecks();
        }, 5000);
      }
    };

    runChecks();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  return null;
}

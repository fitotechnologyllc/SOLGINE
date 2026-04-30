import { adminDb } from '../src/lib/firebase-admin';

async function testFirestore() {
  if (!adminDb) {
    console.error("❌ Firebase Admin not configured.");
    return;
  }

  try {
    const testDoc = adminDb.collection('audit_test').doc('ping');
    await testDoc.set({ 
      status: 'active', 
      timestamp: new Date().toISOString(),
      message: 'SOLGINE_AUDIT_PING'
    });
    console.log("✅ Firestore Write Successful");

    const snap = await testDoc.get();
    if (snap.exists && (snap.data() as any).message === 'SOLGINE_AUDIT_PING') {
      console.log("✅ Firestore Read Successful");
    } else {
      console.error("❌ Firestore Read Mismatch");
    }

    await testDoc.delete();
    console.log("✅ Firestore Delete Successful");

    // Check critical collections
    const collections = [
      'users', 'cards', 'boosterPacks', 'playerCollections', 
      'decks', 'marketListings', 'transactions', 'cardValueIndex', 
      'projects', 'notifications'
    ];

    for (const col of collections) {
      const colSnap = await adminDb.collection(col).limit(1).get();
      console.log(`📡 Collection [${col}]: ${colSnap.size > 0 ? 'HAS_DATA' : 'EMPTY'}`);
    }

  } catch (error) {
    console.error("❌ Firestore Audit Failed:", error);
  }
}

testFirestore();

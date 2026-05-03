import { NextResponse } from 'next/server';
import { adminDb, adminAuth, admin } from '@/lib/firebase-admin';
import { logEvent, logError } from '@/lib/monitor';

export async function POST(req: Request) {
  let userId = 'unknown';
  try {
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // 1. HARDENED AUTH: Verify ID Token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    userId = decodedToken.uid;

    const { cardId, price } = await req.json();

    if (!cardId || typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'INVALID_REQUEST: price must be a positive number.' }, { status: 400 });
    }

    // 2. TRANSACTIONAL EXECUTION
    const result = await adminDb.runTransaction(async (transaction: any) => {
      const userRef = adminDb.collection('users').doc(userId);
      const collRef = adminDb.collection('playerCollections').doc(userId);
      const cardDocRef = adminDb.collection('cards').doc(cardId);
      const indexRef = adminDb.collection('cardValueIndex').doc(cardId);

      const [userSnap, collSnap, cardSnap, indexSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(collRef),
        transaction.get(cardDocRef),
        transaction.get(indexRef)
      ]);

      if (!userSnap.exists) throw new Error("USER_NOT_FOUND");
      if (!collSnap.exists) throw new Error("COLLECTION_NOT_FOUND");
      if (!cardSnap.exists) throw new Error("CARD_NOT_FOUND");

      const userData = userSnap.data()!;
      const collData = collSnap.data()!;
      const cardData = cardSnap.data()!;
      const indexData = indexSnap.exists ? indexSnap.data()! : {};

      const cards = collData.cards || [];
      const cardIndex = cards.findIndex((c: any) => c.cardId === cardId);
      if (cardIndex === -1) throw new Error("CARD_NOT_OWNED");

      const cardOwned = cards[cardIndex];
      const availableCount = (cardOwned.count || 0) - (cardOwned.listedCount || 0);
      if (availableCount <= 0) throw new Error("NO_AVAILABLE_COPIES_TO_LIST");

      // ATOMIC UPDATE: Mark as listed
      cards[cardIndex].listedCount = (cards[cardIndex].listedCount || 0) + 1;
      transaction.update(collRef, { cards });

      // Create Listing
      const listingRef = adminDb.collection('marketListings').doc();
      transaction.set(listingRef, {
        cardId,
        sellerUid: userId,
        sellerDisplayName: userData.displayName || 'Unknown Player',
        price,
        currency: 'SOLG',
        rarity: cardData.rarity,
        cardName: cardData.name,
        cardImageUrl: cardData.imageUrl || '',
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update Value Index
      const floorPrice = (indexData.floorPrice || 0) > 0 ? Math.min(indexData.floorPrice, price) : price;
      transaction.set(indexRef, {
        activeListings: admin.firestore.FieldValue.increment(1),
        floorPrice,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return { success: true, listingId: listingRef.id };
    });

    await logEvent('transaction', `User ${userId} listed ${cardId} for ${price}`, { userId, metadata: { cardId, price } });
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('CRITICAL_MARKET_LIST_ERROR:', error);
    await logError(`Market Listing Failed: ${error.message}`, error, { userId });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

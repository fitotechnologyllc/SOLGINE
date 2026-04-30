import { NextResponse } from 'next/server';
import { adminDb, admin } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const { userId, cardId, price } = await req.json();

    if (!userId || !cardId || typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Using admin SDK (which already uses 'solgine' database)
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userData = userSnap.data();

    const collRef = adminDb.collection('playerCollections').doc(userId);
    const collSnap = await collRef.get();
    if (!collSnap.exists) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }
    const collData = collSnap.data();
    const cards = collData.cards || [];
    
    const cardIndex = cards.findIndex((c: any) => c.cardId === cardId);
    if (cardIndex === -1) {
      return NextResponse.json({ error: 'Card not owned' }, { status: 400 });
    }
    
    const cardOwned = cards[cardIndex];
    const availableCount = (cardOwned.count || 0) - (cardOwned.listedCount || 0);
    if (availableCount <= 0) {
      return NextResponse.json({ error: 'No available copies to list' }, { status: 400 });
    }

    const cardDocRef = adminDb.collection('cards').doc(cardId);
    const cardDocSnap = await cardDocRef.get();
    if (!cardDocSnap.exists) {
      return NextResponse.json({ error: 'Card data not found' }, { status: 404 });
    }
    const cardData = cardDocSnap.data();

    // Mark one as listed
    cards[cardIndex].listedCount = (cards[cardIndex].listedCount || 0) + 1;

    const batch = adminDb.batch();
    batch.set(collRef, { cards }, { merge: true });

    // Create listing
    const listingRef = adminDb.collection('marketListings').doc();
    batch.set(listingRef, {
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
    const indexRef = adminDb.collection('cardValueIndex').doc(cardId);
    const indexSnap = await indexRef.get();
    if (indexSnap.exists) {
      const indexData = indexSnap.data()!;
      const newActiveListings = (indexData.activeListings || 0) + 1;
      const floorPrice = (indexData.floorPrice || 0) > 0 ? Math.min(indexData.floorPrice, price) : price;
      
      batch.update(indexRef, {
        activeListings: newActiveListings,
        floorPrice,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true, listingId: listingRef.id });
  } catch (error: any) {
    console.error('List card error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

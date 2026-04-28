import { NextResponse } from 'next/server';
import { doc, getDoc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(req: Request) {
  try {
    const { userId, cardId, price } = await req.json();

    if (!userId || !cardId || typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userData = userSnap.data();

    const collRef = doc(db, 'playerCollections', userId);
    const collSnap = await getDoc(collRef);
    if (!collSnap.exists()) {
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

    const cardDocRef = doc(db, 'cards', cardId);
    const cardDocSnap = await getDoc(cardDocRef);
    if (!cardDocSnap.exists()) {
      return NextResponse.json({ error: 'Card data not found' }, { status: 404 });
    }
    const cardData = cardDocSnap.data();

    // Mark one as listed
    cards[cardIndex].listedCount = (cards[cardIndex].listedCount || 0) + 1;

    const batch = writeBatch(db);
    batch.set(collRef, { cards }, { merge: true });

    // Create listing
    const listingRef = doc(collection(db, 'marketListings'));
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
      createdAt: new Date().toISOString()
    });

    // Update Value Index
    const indexRef = doc(db, 'cardValueIndex', cardId);
    const indexSnap = await getDoc(indexRef);
    if (indexSnap.exists()) {
      const indexData = indexSnap.data();
      const newActiveListings = (indexData.activeListings || 0) + 1;
      const floorPrice = indexData.floorPrice > 0 ? Math.min(indexData.floorPrice, price) : price;
      
      batch.update(indexRef, {
        activeListings: newActiveListings,
        floorPrice,
        updatedAt: new Date().toISOString()
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true, listingId: listingRef.id });
  } catch (error: any) {
    console.error('List card error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

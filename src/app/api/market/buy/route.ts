import { NextResponse } from 'next/server';
import { doc, getDoc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(req: Request) {
  try {
    const { buyerId, listingId } = await req.json();

    if (!buyerId || !listingId) {
      return NextResponse.json({ error: 'Missing buyerId or listingId' }, { status: 400 });
    }

    const listingRef = doc(db, 'marketListings', listingId);
    const listingSnap = await getDoc(listingRef);
    if (!listingSnap.exists()) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    const listingData = listingSnap.data();

    if (listingData.status !== 'active') {
      return NextResponse.json({ error: 'Listing is not active' }, { status: 400 });
    }

    if (listingData.sellerUid === buyerId) {
      return NextResponse.json({ error: 'Cannot buy your own listing' }, { status: 400 });
    }

    const batch = writeBatch(db);

    // 1. Mark listing as sold
    const soldAt = new Date().toISOString();
    batch.update(listingRef, {
      status: 'sold',
      soldAt,
      buyerUid: buyerId
    });

    // 2. Decrement seller listedCount
    const sellerCollRef = doc(db, 'playerCollections', listingData.sellerUid);
    const sellerCollSnap = await getDoc(sellerCollRef);
    if (sellerCollSnap.exists()) {
      const cards = sellerCollSnap.data().cards || [];
      const cardIndex = cards.findIndex((c: any) => c.cardId === listingData.cardId);
      if (cardIndex !== -1) {
        cards[cardIndex].listedCount = Math.max((cards[cardIndex].listedCount || 0) - 1, 0);
        cards[cardIndex].count = Math.max((cards[cardIndex].count || 0) - 1, 0);
        
        // Remove if 0
        if (cards[cardIndex].count === 0 && cards[cardIndex].listedCount === 0) {
          cards.splice(cardIndex, 1);
        }
        
        batch.set(sellerCollRef, { cards }, { merge: true });
      }
    }

    // 3. Increment buyer count
    const buyerCollRef = doc(db, 'playerCollections', buyerId);
    const buyerCollSnap = await getDoc(buyerCollRef);
    let buyerCards = buyerCollSnap.exists() ? buyerCollSnap.data().cards || [] : [];
    const bCardIndex = buyerCards.findIndex((c: any) => c.cardId === listingData.cardId);
    if (bCardIndex !== -1) {
      buyerCards[bCardIndex].count += 1;
    } else {
      buyerCards.push({ cardId: listingData.cardId, count: 1, listedCount: 0 });
    }
    batch.set(buyerCollRef, { cards: buyerCards }, { merge: true });

    // 4. Create transaction record
    const txRef = doc(collection(db, 'transactions'));
    batch.set(txRef, {
      listingId,
      cardId: listingData.cardId,
      sellerUid: listingData.sellerUid,
      buyerUid: buyerId,
      price: listingData.price,
      currency: listingData.currency,
      timestamp: soldAt
    });

    // 5. Update Value Index
    const indexRef = doc(db, 'cardValueIndex', listingData.cardId);
    const indexSnap = await getDoc(indexRef);
    if (indexSnap.exists()) {
      const indexData = indexSnap.data();
      const activeListings = Math.max((indexData.activeListings || 0) - 1, 0);
      const totalSales = (indexData.totalSales || 0) + 1;
      
      const newHighestSale = Math.max(indexData.highestSale || 0, listingData.price);
      
      // basic moving average approx
      const currentAvg = indexData.averageSale || 0;
      const newAverageSale = currentAvg === 0 ? listingData.price : ((currentAvg * (totalSales - 1)) + listingData.price) / totalSales;

      batch.update(indexRef, {
        activeListings,
        lastSale: listingData.price,
        highestSale: newHighestSale,
        averageSale: Math.round(newAverageSale * 10) / 10,
        totalSales,
        updatedAt: soldAt
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Buy card error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

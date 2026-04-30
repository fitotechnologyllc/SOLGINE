import { NextResponse } from 'next/server';
import { adminDb, admin } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const { buyerId, listingId } = await req.json();

    if (!buyerId || !listingId) {
      return NextResponse.json({ error: 'Missing buyerId or listingId' }, { status: 400 });
    }

    const listingRef = adminDb.collection('marketListings').doc(listingId);
    const listingSnap = await listingRef.get();
    if (!listingSnap.exists) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    const listingData = listingSnap.data()!;

    if (listingData.status !== 'active') {
      return NextResponse.json({ error: 'Listing is not active' }, { status: 400 });
    }

    if (listingData.sellerUid === buyerId) {
      return NextResponse.json({ error: 'Cannot buy your own listing' }, { status: 400 });
    }

    const batch = adminDb.batch();

    // 1. Mark listing as sold
    batch.update(listingRef, {
      status: 'sold',
      soldAt: admin.firestore.FieldValue.serverTimestamp(),
      buyerUid: buyerId
    });

    // 2. Decrement seller listedCount
    const sellerCollRef = adminDb.collection('playerCollections').doc(listingData.sellerUid);
    const sellerCollSnap = await sellerCollRef.get();
    if (sellerCollSnap.exists) {
      const cards = sellerCollSnap.data()?.cards || [];
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
    const buyerCollRef = adminDb.collection('playerCollections').doc(buyerId);
    const buyerCollSnap = await buyerCollRef.get();
    let buyerCards = buyerCollSnap.exists ? buyerCollSnap.data()?.cards || [] : [];
    const bCardIndex = buyerCards.findIndex((c: any) => c.cardId === listingData.cardId);
    if (bCardIndex !== -1) {
      buyerCards[bCardIndex].count += 1;
    } else {
      buyerCards.push({ cardId: listingData.cardId, count: 1, listedCount: 0 });
    }
    batch.set(buyerCollRef, { cards: buyerCards }, { merge: true });

    // 4. Create transaction record
    const txRef = adminDb.collection('transactions').doc();
    batch.set(txRef, {
      listingId,
      cardId: listingData.cardId,
      sellerUid: listingData.sellerUid,
      buyerUid: buyerId,
      price: listingData.price,
      currency: listingData.currency,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // 5. Update Value Index
    const indexRef = adminDb.collection('cardValueIndex').doc(listingData.cardId);
    const indexSnap = await indexRef.get();
    if (indexSnap.exists) {
      const indexData = indexSnap.data()!;
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
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Buy card error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

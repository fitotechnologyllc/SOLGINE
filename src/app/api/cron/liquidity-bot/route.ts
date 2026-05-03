import { NextResponse } from 'next/server';
import { adminDb, admin } from '@/lib/firebase-admin';
import { SYSTEM_USER_ID, CardValueIndex } from '@/lib/economy';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminDb) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    const startTime = Date.now();
    const batch = adminDb.batch();
    let actionsTaken = 0;

    // 1. Fetch all cards in the Value Index
    const cardsSnap = await adminDb.collection('cardValueIndex').get();
    const cards = cardsSnap.docs.map((doc: any) => doc.data() as CardValueIndex);

    for (const card of cards) {
      // Limit bot activity per run to avoid batch overflow
      if (actionsTaken >= 20) break;

      // Rule: If no listings exist, create one at Estimated Value
      if (card.activeListings === 0 && card.estimatedValue > 0) {
        const botListingRef = adminDb.collection('marketListings').doc();
        const variance = (Math.random() * 0.2) - 0.1; // ± 10%
        const price = Math.round(card.estimatedValue * (1 + variance));

        batch.set(botListingRef, {
          cardId: card.cardId,
          cardName: card.cardName,
          rarity: card.rarity,
          price: Math.max(price, 1),
          currency: 'SOLG',
          sellerUid: SYSTEM_USER_ID,
          sellerName: 'SOLGINE_BOT',
          status: 'active',
          isBot: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        actionsTaken++;
        console.log(`[LiquidityBot] Created initial listing for ${card.cardName} at ${price} SOLG`);
      }

      // Rule: Tighten Spread (If floor price is > 150% of estimated value)
      if (card.activeListings > 0 && card.floorPrice > card.estimatedValue * 1.5) {
        const botListingRef = adminDb.collection('marketListings').doc();
        const aggressivePrice = Math.round(card.estimatedValue * 1.1); // Slightly above estimated

        batch.set(botListingRef, {
          cardId: card.cardId,
          cardName: card.cardName,
          rarity: card.rarity,
          price: aggressivePrice,
          currency: 'SOLG',
          sellerUid: SYSTEM_USER_ID,
          sellerName: 'SOLGINE_BOT',
          status: 'active',
          isBot: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        actionsTaken++;
        console.log(`[LiquidityBot] Tightening spread for ${card.cardName}: ${card.floorPrice} -> ${aggressivePrice}`);
      }
    }

    if (actionsTaken > 0) {
      await batch.commit();
    }

    const duration = Date.now() - startTime;
    
    // Log Cron Health
    await adminDb.collection('cronLogs').add({
      job: 'liquidity-bot',
      actionsTaken,
      duration,
      timestamp: new Date(),
      success: true
    });

    return NextResponse.json({ 
      success: true, 
      actionsTaken, 
      duration: `${duration}ms` 
    });

  } catch (error: any) {
    console.error('Liquidity Bot Error:', error);
    
    if (adminDb) {
      await adminDb.collection('cronLogs').add({
        job: 'liquidity-bot',
        error: error.message,
        timestamp: new Date(),
        success: false
      });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

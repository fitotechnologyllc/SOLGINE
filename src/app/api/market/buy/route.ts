import { NextResponse } from 'next/server';
import { adminDb, admin, adminAuth } from '@/lib/firebase-admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { logEvent, logError } from '@/lib/monitor';
import { 
  calculateDemandScore, 
  calculateScarcityScore, 
  calculateEstimatedValue, 
  BASE_RARITY_VALUES, 
  getSystemStatus, 
  checkMarketManipulation, 
  recordTreasuryTransaction, 
  MARKET_FEE_PERCENT 
} from '@/lib/economy';

export async function POST(req: Request) {
  let buyerId = 'unknown';
  try {
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // 1. HARDENED AUTH: Verify ID Token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    buyerId = decodedToken.uid;

    const { listingId } = await req.json();

    if (!listingId) {
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });
    }

    // Rate Limiting (5 purchases per minute) - ATOMIC
    const canBuy = await checkRateLimit(buyerId, 'market_buy', 5, 60);
    if (!canBuy) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    // 2. TRANSACTIONAL EXECUTION
    const result = await adminDb.runTransaction(async (transaction) => {
      // READ PHASE
      const listingRef = adminDb.collection('marketListings').doc(listingId);
      const listingSnap = await transaction.get(listingRef);
      
      if (!listingSnap.exists) throw new Error('Listing not found');
      const listingData = listingSnap.data()!;
      const projectId = listingData.projectId || 'solgine-core';

      // 3. PROJECT & SYSTEM STATUS CHECK
      const statusRef = adminDb.collection('systemStatus').doc(projectId);
      const statusSnap = await transaction.get(statusRef);
      const status = statusSnap.exists ? statusSnap.data() : { tradingPaused: false };

      if (status.tradingPaused) throw new Error('Marketplace trading is temporarily paused for this project.');
      if (listingData.status !== 'active') throw new Error('Listing is no longer active.');
      if (listingData.sellerUid === buyerId) throw new Error('Cannot buy your own listing.');

      // Project configuration enforcement
      const projectRef = adminDb.collection('projects').doc(projectId);
      const projectSnap = await transaction.get(projectRef);
      if (!projectSnap.exists) throw new Error('Project not found');
      const projectData = projectSnap.data()!;

      if (projectData.status !== 'live') throw new Error(`Project is in ${projectData.status} mode. Economy is disabled.`);
      if (!projectData.economyEnabled || !projectData.marketplaceEnabled) throw new Error('Marketplace is disabled for this project.');

      // Collection Checks
      const sellerCollRef = adminDb.collection('playerCollections').doc(listingData.sellerUid);
      const buyerCollRef = adminDb.collection('playerCollections').doc(buyerId);
      
      const [sellerCollSnap, buyerCollSnap] = await Promise.all([
        transaction.get(sellerCollRef),
        transaction.get(buyerCollRef)
      ]);

      // Verify seller actually owns the card and has it listed
      const sellerCards = sellerCollSnap.exists ? sellerCollSnap.data()?.cards || [] : [];
      const cardIdx = sellerCards.findIndex((c: any) => c.cardId === listingData.cardId);
      
      if (cardIdx === -1 || (sellerCards[cardIdx].listedCount || 0) <= 0) {
        throw new Error('Seller no longer possesses this card for sale.');
      }

      // WRITE PHASE
      const projectConfig = projectData.config;
      const platformFeePercent = projectConfig?.fees?.platformFeePercent || MARKET_FEE_PERCENT;
      const ownerFeePercent = projectConfig?.fees?.projectOwnerFeePercent || 0;
      
      const platformFeeAmount = listingData.price * platformFeePercent;
      const ownerFeeAmount = listingData.price * ownerFeePercent;
      const totalFeeAmount = platformFeeAmount + ownerFeeAmount;
      const sellerProceeds = listingData.price - totalFeeAmount;

      // Treasury Accounting (Separated)
      await recordTreasuryTransaction(
        transaction,
        {
          gross: listingData.price,
          platformFee: platformFeeAmount,
          creatorFee: ownerFeeAmount,
          sellerNet: sellerProceeds
        },
        'fee',
        'market',
        projectId,
        listingId,
        `Sale of ${listingData.cardId}`
      );

      // Update Listing
      transaction.update(listingRef, {
        status: 'sold',
        soldAt: admin.firestore.FieldValue.serverTimestamp(),
        buyerUid: buyerId,
        feePaid: totalFeeAmount,
        sellerProceeds
      });

      // Transfer Card: Seller
      sellerCards[cardIdx].listedCount = Math.max((sellerCards[cardIdx].listedCount || 0) - 1, 0);
      sellerCards[cardIdx].count = Math.max((sellerCards[cardIdx].count || 0) - 1, 0);
      if (sellerCards[cardIdx].count === 0 && sellerCards[cardIdx].listedCount === 0) {
        sellerCards.splice(cardIdx, 1);
      }
      transaction.set(sellerCollRef, { cards: sellerCards }, { merge: true });

      // Transfer Card: Buyer
      let buyerCards = buyerCollSnap.exists ? buyerCollSnap.data()?.cards || [] : [];
      const bCardIdx = buyerCards.findIndex((c: any) => c.cardId === listingData.cardId);
      if (bCardIdx !== -1) {
        buyerCards[bCardIdx].count += 1;
      } else {
        buyerCards.push({ cardId: listingData.cardId, count: 1, listedCount: 0 });
      }
      transaction.set(buyerCollRef, { cards: buyerCards }, { merge: true });

      // Transaction Log
      const txRef = adminDb.collection('transactions').doc();
      transaction.set(txRef, {
        projectId,
        listingId,
        cardId: listingData.cardId,
        sellerUid: listingData.sellerUid,
        buyerUid: buyerId,
        price: listingData.price,
        platformFee: platformFeeAmount,
        creatorFee: ownerFeeAmount,
        sellerProceeds,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      // Player Stats
      const buyerStatsRef = adminDb.collection('playerStats').doc(buyerId);
      const sellerStatsRef = adminDb.collection('playerStats').doc(listingData.sellerUid);
      const projectStatsRef = adminDb.collection('projectStats').doc(projectId);

      transaction.set(buyerStatsRef, {
        totalTrades: admin.firestore.FieldValue.increment(1),
        totalSpend: admin.firestore.FieldValue.increment(listingData.price),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      transaction.set(sellerStatsRef, {
        totalTrades: admin.firestore.FieldValue.increment(1),
        totalRevenue: admin.firestore.FieldValue.increment(sellerProceeds),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      transaction.set(projectStatsRef, {
        totalVolume: admin.firestore.FieldValue.increment(listingData.price),
        revenueEarned: admin.firestore.FieldValue.increment(ownerFeeAmount),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return { success: true };
    });

    // Post-Transaction: Value Index Sync (Outside to avoid locking index for too long)
    // We do a simple update now, but ideally this is handled by a background function
    const listingRef = adminDb.collection('marketListings').doc(listingId);
    const listingSnap = await listingRef.get();
    const listingData = listingSnap.data()!;
    
    // Manipulation check after the fact (logs only)
    const indexRef = adminDb.collection('cardValueIndex').doc(listingData.cardId);
    const indexSnap = await indexRef.get();
    const estValue = indexSnap.exists ? indexSnap.data()?.estimatedValue || 0 : 0;
    await checkMarketManipulation(buyerId, listingData.sellerUid, listingData.cardId, listingData.price, estValue);

    await logEvent('market_buy', `Buyer ${buyerId} bought ${listingId}`, { userId: buyerId, metadata: { listingId, price: listingData.price } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('CRITICAL_MARKET_BUY_ERROR:', error);
    await logError(`Market Buy Failed: ${error.message}`, error, { userId: buyerId });
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}


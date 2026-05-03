import { NextResponse } from 'next/server';
import { adminDb, adminAuth, adminApp, admin } from '@/lib/firebase-admin';
import { getSystemStatus, recordTreasuryTransaction, PACK_FEE_PERCENT } from '@/lib/economy';
import { checkRateLimit } from '@/lib/rate-limit';
import { logEvent, logError } from '@/lib/monitor';

export async function POST(req: Request) {
  let userId = 'unknown';
  try {
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ success: false, errorCode: "SERVER_FIREBASE_ADMIN_NOT_CONFIGURED" }, { status: 500 });
    }

    // 1. HARDENED AUTH: Verify ID Token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    userId = decodedToken.uid;

    // 2. ATOMIC RATE LIMITING (10 opens per minute)
    const canOpen = await checkRateLimit(userId, 'pack_open', 10, 60);
    if (!canOpen) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
    }

    const body = await req.json();
    const { packId, useCredit, projectId: reqProjectId } = body;
    const projectId = reqProjectId || 'solgine-core';

    if (!packId) throw new Error("INVALID_REQUEST: Pack ID required.");

    // 3. TRANSACTIONAL EXECUTION
    const result = await adminDb.runTransaction(async (transaction: any) => {
      // 3.1 Verify System Status for this Project
      const statusRef = adminDb.collection('systemStatus').doc(projectId);
      const statusSnap = await transaction.get(statusRef);
      const status = statusSnap.exists ? statusSnap.data() : { packsEnabled: true };
      
      if (!status.packsEnabled) throw new Error("PACKS_DISABLED: Booster station is currently offline.");

      // 3.2 Fetch User & Stats
      const userRef = adminDb.collection('users').doc(userId);
      const statsRef = adminDb.collection('playerStats').doc(userId);
      const playerCollRef = adminDb.collection('playerCollections').doc(userId);
      
      const [userSnap, statsSnap, playerCollSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(statsRef),
        transaction.get(playerCollRef)
      ]);

      const userData = userSnap.exists ? userSnap.data()! : {};
      const stats = statsSnap.exists ? statsSnap.data()! : {};
      
      const today = new Date().toISOString().split('T')[0];
      const dailyOpens = stats.lastPackOpenDate === today ? (stats.dailyPackOpens || 0) : 0;

      if (dailyOpens >= 30) throw new Error("DAILY_LIMIT_REACHED: Daily limit of 30 packs reached.");

      const creditKey = packId.replace('pack_', '') + 'Credits';
      if (useCredit && (userData[creditKey] || 0) <= 0) throw new Error("INSUFFICIENT_CREDITS");

      // 3.3 Fetch Pack Config
      const packRef = adminDb.collection('boosterPacks').doc(packId);
      const packSnap = await transaction.get(packRef);
      if (!packSnap.exists) throw new Error("PACK_NOT_FOUND");
      const packData = packSnap.data()!;

      // Price Multiplier Logic
      let priceMultiplier = 1.0;
      if (dailyOpens >= 20) priceMultiplier = 1.5;
      else if (dailyOpens >= 10) priceMultiplier = 1.2;

      const basePrice = packData.dynamicPrice || packData.price;
      const finalPrice = Math.round(basePrice * priceMultiplier);

      // 3.4 CARD SELECTION (The sensitive part)
      const pulledCards: any[] = [];
      const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
      
      for (let i = 0; i < (packData.cardsPerPack || 1); i++) {
        const roll = Math.random() * 100;
        let selectedRarity = 'common';
        let cumulative = 0;
        for (const [rarity, chance] of Object.entries(packData.rarityOdds || { common: 100 })) {
          cumulative += (chance as number);
          if (roll <= cumulative) {
            selectedRarity = rarity.toLowerCase();
            break;
          }
        }

        // OPTIMIZED QUERY: Find available cards of this rarity in this project
        // Note: In a transaction, we can't do collection queries directly easily if they are large,
        // but for a small project collection it's okay. 
        // For performance, we'll try to find at least one.
        const cardsQuery = adminDb.collection('cards')
          .where('projectId', '==', projectId)
          .where('rarity', '==', selectedRarity)
          .where('status', '==', 'active')
          .limit(20);
          
        const cardsSnap = await transaction.get(cardsQuery);
        let eligibleCards = cardsSnap.docs
          .map((d: any) => ({ id: d.id, ...d.data() } as any))
          .filter((c: any) => !c.supplyLimit || c.mintedCount < c.supplyLimit);

        // Fallback Rarity if sold out
        if (eligibleCards.length === 0) {
          let fallbackIndex = rarityOrder.indexOf(selectedRarity);
          while (eligibleCards.length === 0 && fallbackIndex > 0) {
            fallbackIndex--;
            const fbRarity = rarityOrder[fallbackIndex];
            const fbQuery = adminDb.collection('cards')
              .where('projectId', '==', projectId)
              .where('rarity', '==', fbRarity)
              .where('status', '==', 'active')
              .limit(20);
            const fbSnap = await transaction.get(fbQuery);
            eligibleCards = fbSnap.docs
              .map((d: any) => ({ id: d.id, ...d.data() } as any))
              .filter((c: any) => !c.supplyLimit || c.mintedCount < c.supplyLimit);
          }
        }

        if (eligibleCards.length === 0) continue;

        const randomCard = eligibleCards[Math.floor(Math.random() * eligibleCards.length)];
        pulledCards.push(randomCard);

        // ATOMIC INCREMENT: Mark card as minted
        transaction.update(adminDb.collection('cards').doc(randomCard.id), {
          mintedCount: admin.firestore.FieldValue.increment(1)
        });
        
        transaction.set(adminDb.collection('cardValueIndex').doc(randomCard.id), {
          mintedCount: admin.firestore.FieldValue.increment(1)
        }, { merge: true });
      }

      if (pulledCards.length === 0) throw new Error("OUT_OF_STOCK: No available cards found in project supply.");

      // 3.5 UPDATES
      // Treasury
      if (!useCredit) {
        const platformFee = finalPrice * PACK_FEE_PERCENT;
        const creatorNet = finalPrice - platformFee;
        await recordTreasuryTransaction(
          transaction,
          {
            gross: finalPrice,
            platformFee,
            creatorFee: 0, // In packs, usually platform takes fee, creator gets net
            sellerNet: creatorNet
          },
          'fee',
          'packs',
          projectId,
          'pack_opening',
          `Pack purchase: ${packId}`
        );
      } else {
        transaction.update(userRef, { [creditKey]: admin.firestore.FieldValue.increment(-1) });
      }

      // Collection
      let existingCards = playerCollSnap.exists ? playerCollSnap.data()?.cards || [] : [];
      for (const pulled of pulledCards) {
        const idx = existingCards.findIndex((c: any) => c.cardId === pulled.id);
        if (idx >= 0) existingCards[idx].count += 1;
        else existingCards.push({ cardId: pulled.id, count: 1 });
      }
      transaction.set(playerCollRef, { cards: existingCards }, { merge: true });

      // Stats
      transaction.set(statsRef, {
        dailyPackOpens: dailyOpens + 1,
        lastPackOpenDate: today,
        totalPacksOpened: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Log
      const openingRef = adminDb.collection('packOpenings').doc();
      transaction.set(openingRef, {
        userId,
        projectId,
        packId,
        cardsPulled: pulledCards.map((c: any) => c.id),
        pricePaid: finalPrice,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, cards: pulledCards, pricePaid: finalPrice };
    });

    await logEvent('pack_open', `User ${userId} opened ${packId}`, { userId, metadata: { packId, cards: result.cards.length } });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("CRITICAL_PACK_OPEN_ERROR:", error);
    await logError(`Pack Opening Failed: ${error.message}`, error, { userId });
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


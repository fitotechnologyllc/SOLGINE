import { NextResponse } from 'next/server';
import { adminDb, adminAuth, admin } from '@/lib/firebase-admin';
import { logEvent, logError } from '@/lib/monitor';

export async function POST(req: Request) {
  let userId = 'unknown';
  try {
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: 'Server authentication module not configured' }, { status: 500 });
    }

    // 1. HARDENED AUTH: Verify ID Token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    userId = decodedToken.uid;

    const body = await req.json();
    const { deckId, name, cards: deckCards, isActive } = body;

    if (!name || !Array.isArray(deckCards) || deckCards.length !== 10) {
      return NextResponse.json({ error: 'Deck must have exactly 10 cards and a name.' }, { status: 400 });
    }

    // 2. TRANSACTIONAL EXECUTION
    const result = await adminDb.runTransaction(async (transaction: any) => {
      // 2.1 Validate Ownership (Inside Transaction)
      const playerCollRef = adminDb.collection('playerCollections').doc(userId);
      const playerCollSnap = await transaction.get(playerCollRef);
      
      if (!playerCollSnap.exists) throw new Error("COLLECTION_NOT_FOUND");
      const ownedCards = playerCollSnap.data()?.cards || [];
      const ownedMap: Record<string, number> = {};
      ownedCards.forEach((c: any) => {
        ownedMap[c.cardId] = (ownedMap[c.cardId] || 0) + c.count;
      });

      const deckMap: Record<string, number> = {};
      for (const cardId of deckCards) {
        deckMap[cardId] = (deckMap[cardId] || 0) + 1;
      }

      for (const [cardId, count] of Object.entries(deckMap)) {
        if ((ownedMap[cardId] || 0) < count) {
          throw new Error(`INSUFFICIENT_COPIES: You do not own enough of ${cardId}.`);
        }
      }

      // 2.2 Fetch Card Data for Stats (Inside Transaction)
      // Note: We'll do this outside if too many, but 10 is fine.
      const cardDataMap: Record<string, any> = {};
      for (const cardId of Object.keys(deckMap)) {
        const cSnap = await transaction.get(adminDb.collection('cards').doc(cardId));
        if (cSnap.exists) cardDataMap[cardId] = cSnap.data();
      }

      // 2.3 Calculate Power Score
      let totalAttack = 0;
      let totalDefense = 0;
      let totalRarityBonus = 0;
      const rarities: Record<string, number> = {};
      const rarityBonuses: Record<string, number> = { common: 1, uncommon: 3, rare: 6, epic: 10, legendary: 20, mythic: 40 };

      for (const cardId of deckCards) {
        const card = cardDataMap[cardId] || {};
        totalAttack += (card.attack || 0);
        totalDefense += (card.defense || 0);
        const rarity = (card.rarity || 'common').toLowerCase();
        totalRarityBonus += (rarityBonuses[rarity] || 0);
        rarities[rarity] = (rarities[rarity] || 0) + 1;
      }

      const powerScore = totalAttack + totalDefense + totalRarityBonus;
      let primaryRarity = 'common';
      let maxCount = 0;
      for (const [r, count] of Object.entries(rarities)) {
        if (count > maxCount) {
          maxCount = count;
          primaryRarity = r;
        }
      }

      // 2.4 Atomic Deactivation of other decks
      if (isActive) {
        const activeDecksQuery = adminDb.collection('decks')
          .where('userId', '==', userId)
          .where('isActive', '==', true);
        const activeDecksSnap = await transaction.get(activeDecksQuery);
        activeDecksSnap.forEach((doc: any) => {
          if (doc.id !== deckId) {
            transaction.update(doc.ref, { isActive: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
          }
        });
      }

      const deckRef = deckId ? adminDb.collection('decks').doc(deckId) : adminDb.collection('decks').doc();
      const finalDeckId = deckRef.id;

      const deckData = {
        deckId: finalDeckId,
        userId,
        name,
        cards: deckCards,
        totalCards: deckCards.length,
        primaryRarity,
        powerScore,
        isActive: !!isActive,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp() // set on every save or use merge
      };

      transaction.set(deckRef, deckData, { merge: true });

      return { success: true, deckId: finalDeckId, powerScore };
    });

    await logEvent('api_success', `User ${userId} saved deck ${result.deckId}`, { userId });
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('CRITICAL_DECK_SAVE_ERROR:', error);
    await logError(`Deck Save Failed: ${error.message}`, error, { userId });
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

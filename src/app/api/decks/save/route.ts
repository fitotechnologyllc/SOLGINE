import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const body = await req.json();
    const { deckId, name, cards: deckCards, isActive } = body;

    if (!name || !Array.isArray(deckCards) || deckCards.length !== 10) {
      return NextResponse.json({ error: 'Deck must have exactly 10 cards and a name.' }, { status: 400 });
    }

    // 1. Validate Ownership
    const playerCollRef = adminDb.collection('playerCollections').doc(userId);
    const playerCollSnap = await playerCollRef.get();
    
    if (!playerCollSnap.exists) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

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
        return NextResponse.json({ error: `Insufficient copies of card ${cardId}` }, { status: 400 });
      }
    }

    // 2. Fetch Card Data for Stats
    const cardDocs = await Promise.all(
      Object.keys(deckMap).map(id => adminDb.collection('cards').doc(id).get())
    );
    
    const cardDataMap: Record<string, any> = {};
    cardDocs.forEach(doc => {
      if (doc.exists) cardDataMap[doc.id] = doc.data();
    });

    // 3. Validation: At least one creature/hero
    let hasCreature = false;
    let totalAttack = 0;
    let totalDefense = 0;
    let totalRarityBonus = 0;
    const rarities: Record<string, number> = {};

    const rarityBonuses: Record<string, number> = {
      common: 1,
      uncommon: 3,
      rare: 6,
      epic: 10,
      legendary: 20,
      mythic: 40
    };

    for (const cardId of deckCards) {
      const card = cardDataMap[cardId];
      if (!card) continue;
      
      if (card.type === 'character' || card.type === 'creature' || card.type === 'hero' || !card.type) {
        hasCreature = true;
      }

      totalAttack += (card.attack || 0);
      totalDefense += (card.defense || 0);
      
      const rarity = (card.rarity || 'common').toLowerCase();
      totalRarityBonus += (rarityBonuses[rarity] || 0);
      
      rarities[rarity] = (rarities[rarity] || 0) + 1;
    }

    if (!hasCreature) {
      return NextResponse.json({ error: 'Deck must have at least one character/hero card.' }, { status: 400 });
    }

    const powerScore = totalAttack + totalDefense + totalRarityBonus;
    
    // Find primary rarity
    let primaryRarity = 'common';
    let maxCount = 0;
    for (const [r, count] of Object.entries(rarities)) {
      if (count > maxCount) {
        maxCount = count;
        primaryRarity = r;
      }
    }

    const batch = adminDb.batch();

    // If this deck is active, deactivate others
    if (isActive) {
      const activeDecks = await adminDb.collection('decks')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();
      
      activeDecks.forEach(doc => {
        batch.update(doc.ref, { isActive: false, updatedAt: new Date().toISOString() });
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
      updatedAt: new Date().toISOString(),
      ...(deckId ? {} : { createdAt: new Date().toISOString() })
    };

    batch.set(deckRef, deckData, { merge: true });

    await batch.commit();

    return NextResponse.json({ success: true, deckId: finalDeckId, powerScore });

  } catch (error: any) {
    console.error('DECK SAVE ERROR:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

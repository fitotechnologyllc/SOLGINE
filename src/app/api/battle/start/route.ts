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

    // 1. Get Active Deck
    const decksQuery = await adminDb.collection('decks')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (decksQuery.empty) {
      return NextResponse.json({ error: 'You need an active deck before entering combat.' }, { status: 400 });
    }

    const deckDoc = decksQuery.docs[0];
    const deckData = deckDoc.data();

    if (deckData.totalCards !== 10) {
      return NextResponse.json({ error: 'Active deck must have exactly 10 cards.' }, { status: 400 });
    }

    // 2. Load Card Data
    const cardIds = deckData.cards;
    const cardDocs = await Promise.all(cardIds.map((id: string) => adminDb.collection('cards').doc(id).get()));
    const playerDeckCards = cardDocs.map(d => ({ id: d.id, ...d.data() }));

    // 3. Generate AI Deck
    // For MVP, we'll use a selection of standard cards
    const allCardsSnap = await adminDb.collection('cards').limit(20).get();
    let availableCards = allCardsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Shuffle and pick 10
    const aiDeckCards = availableCards.sort(() => 0.5 - Math.random()).slice(0, 10);
    
    // If db is empty, fallback to basic cards
    if (aiDeckCards.length < 10) {
        // Fallback or seed logic if needed, but assuming cards exist
    }

    // 4. Initialize Match
    const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);
    const shuffledPlayerDeck = shuffle(playerDeckCards);
    const shuffledAiDeck = shuffle(aiDeckCards);

    const playerHand = shuffledPlayerDeck.splice(0, 3);
    const aiHand = shuffledAiDeck.splice(0, 3);

    const matchRef = adminDb.collection('matches').doc();
    const matchId = matchRef.id;

    const matchState = {
      matchId,
      userId,
      opponentType: 'ai',
      status: 'active',
      playerHp: 100,
      aiHp: 100,
      playerDeck: shuffledPlayerDeck,
      aiDeck: shuffledAiDeck,
      playerHand,
      aiHand,
      playedCards: [], // tracks cards on field or discarded
      turn: 'player',
      turnNumber: 1,
      battleLog: [
        { type: 'system', message: 'Battle Initialized. Neural link established.', timestamp: new Date().toISOString() },
        { type: 'system', message: 'You drew 3 cards.', timestamp: new Date().toISOString() }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await matchRef.set(matchState);

    return NextResponse.json({ success: true, matchId, match: matchState });

  } catch (error: any) {
    console.error('BATTLE START ERROR:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

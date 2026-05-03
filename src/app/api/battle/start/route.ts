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
    const { projectId: reqProjectId } = body;
    const projectId = reqProjectId || 'solgine-core';

    // 2. TRANSACTIONAL EXECUTION
    const result = await adminDb.runTransaction(async (transaction: any) => {
      // 2.1 Check for already active matches (Prevent double match)
      const existingQuery = adminDb.collection('matches')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .limit(1);
      const existingSnap = await transaction.get(existingQuery);
      if (!existingSnap.empty) {
        throw new Error("MATCH_ALREADY_ACTIVE: Complete your current battle first.");
      }

      // 2.2 Get Active Deck
      const decksQuery = adminDb.collection('decks')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .limit(1);
      const decksSnap = await transaction.get(decksQuery);

      if (decksSnap.empty) throw new Error("NO_ACTIVE_DECK: Activate a deck in Studio first.");
      const deckData = decksSnap.docs[0].data();
      if (deckData.totalCards !== 10) throw new Error("INVALID_DECK: Decks must have 10 cards.");

      // 2.3 Load Card Data
      const cardIds = deckData.cards;
      const playerDeckCards: any[] = [];
      for (const id of cardIds) {
        const cSnap = await transaction.get(adminDb.collection('cards').doc(id));
        if (cSnap.exists) playerDeckCards.push({ id: cSnap.id, ...cSnap.data() });
      }

      // 2.4 Generate AI Deck (Atomic Snapshot)
      const allCardsQuery = adminDb.collection('cards')
        .where('projectId', '==', projectId)
        .where('status', '==', 'active')
        .limit(20);
      const allCardsSnap = await transaction.get(allCardsQuery);
      let availableCards = allCardsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const aiDeckCards = availableCards.sort(() => 0.5 - Math.random()).slice(0, 10);

      // 2.5 Initialize State
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
        projectId,
        opponentType: 'ai',
        status: 'active',
        playerHp: 100,
        aiHp: 100,
        playerDeck: shuffledPlayerDeck,
        aiDeck: shuffledAiDeck,
        playerHand,
        aiHand,
        playedCards: [],
        turn: 'player',
        turnNumber: 1,
        battleLog: [
          { type: 'system', message: 'Battle Initialized. Neural link established.', timestamp: new Date().toISOString() },
          { type: 'system', message: 'You drew 3 cards.', timestamp: new Date().toISOString() }
        ],
        processedActions: [], // For idempotency
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      transaction.set(matchRef, matchState);
      return { success: true, matchId, match: matchState };
    });

    await logEvent('api_success', `User ${userId} started battle ${result.matchId}`, { userId });
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('CRITICAL_BATTLE_START_ERROR:', error);
    await logError(`Battle Start Failed: ${error.message}`, error, { userId });
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

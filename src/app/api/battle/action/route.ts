import { NextResponse } from 'next/server';
import { adminDb, adminAuth, admin } from '@/lib/firebase-admin';
import { calculateLevel, getLevelRewards } from '@/lib/rewards';
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
    const { matchId, action, cardId, actionId } = body;

    if (!matchId || !action || !actionId) {
      return NextResponse.json({ error: 'INVALID_REQUEST: matchId, action, and actionId are required.' }, { status: 400 });
    }

    // 2. TRANSACTIONAL EXECUTION
    const result = await adminDb.runTransaction(async (transaction: any) => {
      const matchRef = adminDb.collection('matches').doc(matchId);
      const matchSnap = await transaction.get(matchRef);

      if (!matchSnap.exists) throw new Error("MATCH_NOT_FOUND");
      const match = matchSnap.data()!;

      // 2.1 Security Checks
      if (match.userId !== userId) throw new Error("UNAUTHORIZED_MATCH_ACCESS");
      if (match.status !== 'active') throw new Error("MATCH_ALREADY_OVER");

      // 2.2 IDEMPOTENCY: Check if this actionId has already been processed
      if (match.processedActions && match.processedActions.includes(actionId)) {
        return { success: true, match, message: "Action already processed." };
      }

      // 2.3 Battle Logic Implementation (Migrated to Transaction)
      let updatedMatch = { ...match };
      const logs = [...(match.battleLog || [])];
      const processedActions = [...(match.processedActions || []), actionId];

      const applyAbility = (card: any, target: 'player' | 'ai', currentMatch: any) => {
        const ability = card.ability?.toLowerCase() || '';
        let effectLog = '';
        if (ability.includes('shield wall')) {
          currentMatch[`${target}Shield`] = true;
          effectLog = `${card.name} activated SHIELD WALL! 50% damage reduction next turn.`;
        } else if (ability.includes('nova blast')) {
          const bonus = Math.floor(card.attack * 0.5);
          if (target === 'player') currentMatch.aiHp = Math.max(0, currentMatch.aiHp - bonus);
          else currentMatch.playerHp = Math.max(0, currentMatch.playerHp - bonus);
          effectLog = `${card.name} unleashed NOVA BLAST! Extra ${bonus} damage.`;
        } else if (ability.includes('void step')) {
          currentMatch[`${target}Dodge`] = 0.3;
          effectLog = `${card.name} entered VOID STEP! 30% dodge chance active.`;
        } else if (ability.includes('celestial breath')) {
          const heal = Math.floor(card.attack * 0.3);
          if (target === 'player') currentMatch.playerHp = Math.min(100, currentMatch.playerHp + heal);
          else currentMatch.aiHp = Math.min(100, currentMatch.aiHp + heal);
          effectLog = `${card.name} used CELESTIAL BREATH! Recovered ${heal} HP.`;
        }
        return effectLog;
      };

      if (action === 'attack') {
        if (match.turn !== 'player') throw new Error("NOT_YOUR_TURN");
        
        const cardIndex = match.playerHand.findIndex((c: any) => c.id === cardId);
        if (cardIndex === -1) throw new Error("CARD_NOT_IN_HAND");

        const card = match.playerHand[cardIndex];
        let damage = card.attack || 0;

        if (match.aiDodge && Math.random() < match.aiDodge) {
          logs.push({ type: 'ai', message: 'AI EVADED your attack!', timestamp: new Date().toISOString() });
          damage = 0;
          updatedMatch.aiDodge = 0;
        }

        if (match.aiShield && damage > 0) {
          damage = Math.floor(damage / 2);
          updatedMatch.aiShield = false;
          logs.push({ type: 'ai', message: 'AI SHIELD absorbed 50% damage.', timestamp: new Date().toISOString() });
        }

        updatedMatch.aiHp = Math.max(0, updatedMatch.aiHp - damage);
        updatedMatch.playerHand.splice(cardIndex, 1);
        updatedMatch.playedCards = [...(updatedMatch.playedCards || []), { ...card, owner: 'player', turn: match.turnNumber }];

        logs.push({ 
          type: 'player', 
          message: `You played ${card.name} for ${damage} damage.`, 
          timestamp: new Date().toISOString() 
        });

        const abilityLog = applyAbility(card, 'player', updatedMatch);
        if (abilityLog) logs.push({ type: 'system', message: abilityLog, timestamp: new Date().toISOString() });

        if (updatedMatch.aiHp <= 0) {
          updatedMatch.status = 'won';
          updatedMatch.completedAt = new Date().toISOString();
          logs.push({ type: 'system', message: 'VICTORY! Opponent neural core offline.', timestamp: new Date().toISOString() });
        }
      } 

      // AI Turn Logic (Simplified integration for transaction)
      if (action === 'endTurn' || (action === 'attack' && updatedMatch.status === 'active')) {
        if (action === 'endTurn' || (action === 'attack' && updatedMatch.turn === 'player')) {
          updatedMatch.turn = 'ai';
          
          // AI Draw
          if (updatedMatch.aiDeck && updatedMatch.aiDeck.length > 0) {
            const drawn = updatedMatch.aiDeck.shift();
            updatedMatch.aiHand.push(drawn);
          }

          // AI Action
          if (updatedMatch.aiHand && updatedMatch.aiHand.length > 0) {
            let selectedCardIdx = 0; // Default to first
            // Simple AI logic: strongest attack
            let maxAtk = -1;
            updatedMatch.aiHand.forEach((c: any, i: number) => {
              if ((c.attack || 0) > maxAtk) {
                maxAtk = c.attack;
                selectedCardIdx = i;
              }
            });

            const aiCard = updatedMatch.aiHand.splice(selectedCardIdx, 1)[0];
            let aiDamage = aiCard.attack || 0;

            if (updatedMatch.playerShield && aiDamage > 0) {
              aiDamage = Math.floor(aiDamage / 2);
              updatedMatch.playerShield = false;
              logs.push({ type: 'player', message: 'YOUR SHIELD absorbed 50% damage.', timestamp: new Date().toISOString() });
            }

            updatedMatch.playerHp = Math.max(0, updatedMatch.playerHp - aiDamage);
            updatedMatch.playedCards = [...(updatedMatch.playedCards || []), { ...aiCard, owner: 'ai', turn: match.turnNumber }];
            
            logs.push({ 
              type: 'ai', 
              message: `AI played ${aiCard.name} for ${aiDamage} damage.`, 
              timestamp: new Date().toISOString() 
            });

            const aiAbilityLog = applyAbility(aiCard, 'ai', updatedMatch);
            if (aiAbilityLog) logs.push({ type: 'system', message: aiAbilityLog, timestamp: new Date().toISOString() });

            if (updatedMatch.playerHp <= 0) {
              updatedMatch.status = 'lost';
              updatedMatch.completedAt = new Date().toISOString();
              logs.push({ type: 'system', message: 'DEFEAT. Neural link severed.', timestamp: new Date().toISOString() });
            }
          }

          // Return turn to player
          if (updatedMatch.status === 'active') {
            if (updatedMatch.playerDeck && updatedMatch.playerDeck.length > 0) {
              const pDrawn = updatedMatch.playerDeck.shift();
              updatedMatch.playerHand.push(pDrawn);
            }
            updatedMatch.turnNumber += 1;
            updatedMatch.turn = 'player';
          }
        }
      }

      // 2.4 Handle Completion & Rewards Atomically
      if (updatedMatch.status !== 'active') {
        const userRef = adminDb.collection('users').doc(userId);
        const userSnap = await transaction.get(userRef);
        const userData = userSnap.data() || {};
        
        const won = updatedMatch.status === 'won';
        let xpGain = won ? 100 : 25;
        if (won && updatedMatch.playerHp < 20) xpGain += 25; // Clutch bonus

        const oldXp = userData.xp || 0;
        const newXp = oldXp + xpGain;
        const oldLevel = calculateLevel(oldXp);
        const newLevel = calculateLevel(newXp);
        const levelRewards = getLevelRewards(oldLevel, newLevel);

        transaction.set(userRef, {
          xp: newXp,
          level: newLevel,
          battlesPlayed: admin.firestore.FieldValue.increment(1),
          battlesWon: admin.firestore.FieldValue.increment(won ? 1 : 0),
          battlesLost: admin.firestore.FieldValue.increment(won ? 0 : 1),
          starterCredits: admin.firestore.FieldValue.increment(levelRewards.starter),
          standardCredits: admin.firestore.FieldValue.increment(levelRewards.standard),
          premiumCredits: admin.firestore.FieldValue.increment(levelRewards.premium),
          eliteCredits: admin.firestore.FieldValue.increment(levelRewards.elite),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Battle History Log
        const battleLogRef = adminDb.collection('battles').doc();
        transaction.set(battleLogRef, {
          userId,
          matchId,
          status: updatedMatch.status,
          xpEarned: xpGain,
          turnNumber: updatedMatch.turnNumber,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      updatedMatch.battleLog = logs;
      updatedMatch.processedActions = processedActions;
      updatedMatch.updatedAt = new Date().toISOString();

      transaction.set(matchRef, updatedMatch);

      return { success: true, match: updatedMatch };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('CRITICAL_BATTLE_ACTION_ERROR:', error);
    await logError(`Battle Action Failed: ${error.message}`, error, { userId });
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}


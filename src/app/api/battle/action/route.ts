import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    if (!adminDb || !adminAuth) {
      console.warn("SERVER_FIREBASE_ADMIN_NOT_CONFIGURED");
      return NextResponse.json({ error: 'Server authentication module not configured' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const body = await req.json();
    const { matchId, action, cardId } = body;

    const matchRef = adminDb.collection('matches').doc(matchId);
    const matchSnap = await matchRef.get();

    if (!matchSnap.exists) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    const match = matchSnap.data()!;

    if (match.userId !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (match.status !== 'active') return NextResponse.json({ error: 'Match is already over' }, { status: 400 });

    const batch = adminDb.batch();
    let updatedMatch = { ...match };
    const logs = [...match.battleLog];

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
        currentMatch[`${target}Dodge`] = 0.3; // 30% dodge chance
        effectLog = `${card.name} entered VOID STEP! 30% dodge chance active.`;
      } else if (ability.includes('celestial breath')) {
        const heal = Math.floor(card.attack * 0.3);
        if (target === 'player') currentMatch.playerHp = Math.min(100, currentMatch.playerHp + heal);
        else currentMatch.aiHp = Math.min(100, currentMatch.aiHp + heal);
        effectLog = `${card.name} used CELESTIAL BREATH! Recovered ${heal} HP.`;
      } else if (ability.includes('solar flare')) {
        effectLog = `${card.name} ignited SOLAR FLARE! Critical impact imminent.`;
      }

      return effectLog;
    };

    if (action === 'attack') {
      if (match.turn !== 'player') return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
      
      const cardIndex = match.playerHand.findIndex((c: any) => c.id === cardId);
      if (cardIndex === -1) return NextResponse.json({ error: 'Card not in hand' }, { status: 400 });

      const card = match.playerHand[cardIndex];
      let damage = card.attack || 0;

      // Check AI Dodge
      if (match.aiDodge && Math.random() < match.aiDodge) {
        logs.push({ type: 'ai', message: 'AI EVADED your attack!', timestamp: new Date().toISOString() });
        damage = 0;
      }

      // Check AI Shield
      if (match.aiShield && damage > 0) {
        damage = Math.floor(damage / 2);
        updatedMatch.aiShield = false;
        logs.push({ type: 'ai', message: 'AI SHIELD absorbed 50% damage.', timestamp: new Date().toISOString() });
      }

      updatedMatch.aiHp = Math.max(0, updatedMatch.aiHp - damage);
      updatedMatch.playerHand.splice(cardIndex, 1);
      updatedMatch.playedCards.push({ ...card, owner: 'player', turn: match.turnNumber });

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
        const summary = await updateStats(userId, true, updatedMatch.playerHp);
        logs.push({ type: 'system', message: `Rewards: +${summary.xpGain} XP earned.`, timestamp: new Date().toISOString() });
        if (summary.leveledUp) logs.push({ type: 'system', message: `LEVEL UP! reached level ${updatedMatch.level + 1}`, timestamp: new Date().toISOString() });

        // Record battle
        await adminDb.collection('battles').add({
          userId,
          status: 'won',
          xpEarned: summary.xpGain,
          playerHp: updatedMatch.playerHp,
          aiHp: updatedMatch.aiHp,
          turnNumber: updatedMatch.turnNumber,
          timestamp: new Date().toISOString()
        });
      }
    } 

    if (action === 'endTurn' || (action === 'attack' && updatedMatch.status === 'active')) {
      if (action === 'endTurn') {
         updatedMatch.turn = 'ai';
         logs.push({ type: 'system', message: 'AI Turn Processing...', timestamp: new Date().toISOString() });
         
         // 1. AI Draw
         if (updatedMatch.aiDeck.length > 0) {
            const drawn = updatedMatch.aiDeck.shift();
            updatedMatch.aiHand.push(drawn);
         }

         // 2. AI Strategy
         if (updatedMatch.aiHand.length > 0) {
            // Find best card:
            // - If can kill player, use that.
            // - If low HP, prefer defensive abilities.
            // - Else, strongest attack.
            
            let selectedCardIdx = 0;
            const canKillIdx = updatedMatch.aiHand.findIndex((c: any) => (c.attack || 0) >= updatedMatch.playerHp);
            const lowHp = updatedMatch.aiHp < 40;
            const defensiveIdx = updatedMatch.aiHand.findIndex((c: any) => 
               c.ability?.toLowerCase().includes('shield') || c.ability?.toLowerCase().includes('void')
            );

            if (canKillIdx !== -1) selectedCardIdx = canKillIdx;
            else if (lowHp && defensiveIdx !== -1) selectedCardIdx = defensiveIdx;
            else {
               // Strongest card
               let maxAtk = -1;
               updatedMatch.aiHand.forEach((c: any, i: number) => {
                  if ((c.attack || 0) > maxAtk) {
                     maxAtk = c.attack;
                     selectedCardIdx = i;
                  }
               });
            }

            const aiCard = updatedMatch.aiHand.splice(selectedCardIdx, 1)[0];
            let aiDamage = aiCard.attack || 0;

            // Check Player Dodge
            if (updatedMatch.playerDodge && Math.random() < updatedMatch.playerDodge) {
               logs.push({ type: 'player', message: 'YOU EVADED AI attack!', timestamp: new Date().toISOString() });
               aiDamage = 0;
               updatedMatch.playerDodge = 0; // Reset after dodge
            }

            // Check Player Shield
            if (updatedMatch.playerShield && aiDamage > 0) {
               aiDamage = Math.floor(aiDamage / 2);
               updatedMatch.playerShield = false;
               logs.push({ type: 'player', message: 'YOUR SHIELD absorbed 50% damage.', timestamp: new Date().toISOString() });
            }

            updatedMatch.playerHp = Math.max(0, updatedMatch.playerHp - aiDamage);
            updatedMatch.playedCards.push({ ...aiCard, owner: 'ai', turn: match.turnNumber });
            
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
              const summary = await updateStats(userId, false, updatedMatch.playerHp);
              logs.push({ type: 'system', message: `Rewards: +${summary.xpGain} XP earned.`, timestamp: new Date().toISOString() });
              
              // Record battle
              await adminDb.collection('battles').add({
                userId,
                status: 'lost',
                xpEarned: summary.xpGain,
                playerHp: updatedMatch.playerHp,
                aiHp: updatedMatch.aiHp,
                turnNumber: updatedMatch.turnNumber,
                timestamp: new Date().toISOString()
              });
            }
         }

         // 3. Draw for player
         if (updatedMatch.status === 'active' && updatedMatch.playerDeck.length > 0) {
            const playerDrawn = updatedMatch.playerDeck.shift();
            updatedMatch.playerHand.push(playerDrawn);
            logs.push({ type: 'system', message: `Turn ${match.turnNumber + 1}: You drew a card.`, timestamp: new Date().toISOString() });
         }

         updatedMatch.turnNumber += 1;
         updatedMatch.turn = 'player';
      }
    }

    updatedMatch.battleLog = logs;
    updatedMatch.updatedAt = new Date().toISOString();

    await matchRef.set(updatedMatch);

    return NextResponse.json({ success: true, match: updatedMatch });

  } catch (error: any) {
    console.error('BATTLE ACTION ERROR:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

async function updateStats(userId: string, won: boolean, playerHp?: number) {
  const userRef = adminDb.collection('users').doc(userId);
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};
  
  // 1. Calculate XP Gain
  let xpGain = won ? 100 : 25;
  
  // Close match bonus
  if (won && playerHp && playerHp < 20) {
    xpGain += 25;
  }

  // Win Streak
  let newStreak = won ? (userData.winStreak || 0) + 1 : 0;
  if (won) {
    if (newStreak === 3) xpGain += 25;
    else if (newStreak === 5) xpGain += 50;
    else if (newStreak === 10) xpGain += 150;
  }

  const oldXp = userData.xp || 0;
  const newXp = oldXp + xpGain;
  
  // 2. Level Up Check
  const oldLevel = calculateLevel(oldXp);
  const newLevel = calculateLevel(newXp);
  
  const levelRewards = getLevelRewards(oldLevel, newLevel);

  const stats = {
    xp: newXp,
    level: newLevel,
    battlesPlayed: (userData.battlesPlayed || 0) + 1,
    battlesWon: (userData.battlesWon || 0) + (won ? 1 : 0),
    battlesLost: (userData.battlesLost || 0) + (won ? 0 : 1),
    winStreak: newStreak,
    starterCredits: (userData.starterCredits || 0) + levelRewards.starter,
    standardCredits: (userData.standardCredits || 0) + levelRewards.standard,
    premiumCredits: (userData.premiumCredits || 0) + levelRewards.premium,
    eliteCredits: (userData.eliteCredits || 0) + levelRewards.elite,
    updatedAt: new Date().toISOString()
  };

  await userRef.set(stats, { merge: true });

  // Log Level Up Event
  if (newLevel > oldLevel) {
    await adminDb.collection('levelEvents').add({
      userId,
      oldLevel,
      newLevel,
      rewards: levelRewards,
      timestamp: new Date().toISOString()
    });
  }

  return { xpGain, leveledUp: newLevel > oldLevel, levelRewards };
}

// Utility imports for the route
import { calculateLevel, getLevelRewards } from '@/lib/rewards';


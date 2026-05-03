import { NextResponse } from 'next/server';
import { adminDb, adminAuth, admin } from '@/lib/firebase-admin';
import { calculateLevel } from '@/lib/rewards';
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

    // 2. TRANSACTIONAL EXECUTION
    const result = await adminDb.runTransaction(async (transaction: any) => {
      const userRef = adminDb.collection('users').doc(userId);
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists) throw new Error("USER_NOT_FOUND");
      const userData = userSnap.data()!;

      // 2.1 COOLDOWN & STREAK VERIFICATION
      const lastClaim = userData.lastRewardClaimAt ? new Date(userData.lastRewardClaimAt) : null;
      const now = new Date();
      
      let currentStreak = userData.dailyStreak || 0;

      if (lastClaim) {
        const diffMs = now.getTime() - lastClaim.getTime();
        const diffHours = diffMs / (60 * 60 * 1000);

        if (diffHours < 24) {
          const remaining = 24 * 60 * 60 * 1000 - diffMs;
          const hours = Math.floor(remaining / (60 * 60 * 1000));
          throw new Error(`COOLDOWN_ACTIVE: You can claim again in ${hours} hours.`);
        }

        // If more than 48 hours passed, streak is broken
        if (diffHours >= 48) {
          currentStreak = 1;
        } else {
          currentStreak = (currentStreak % 7) + 1;
        }
      } else {
        currentStreak = 1;
      }

      // 2.2 REWARD LADDER LOGIC
      let rewards: any = { starterCredits: 0, premiumCredits: 0, rareBoost: 0 };
      let xpGain = 25;

      switch (currentStreak) {
        case 1: 
          rewards.starterCredits = 1; 
          break;
        case 2: 
          rewards.starterCredits = 2; 
          xpGain = 50;
          break;
        case 3: 
          rewards.rareBoost = 1; 
          xpGain = 75;
          break;
        case 7: 
          rewards.premiumCredits = 1; 
          xpGain = 200;
          break;
        default: 
          rewards.starterCredits = 1;
          xpGain = 30;
          break;
      }

      // 2.3 ATOMIC INCREMENTS
      const oldXp = userData.xp || 0;
      const newXp = oldXp + xpGain;
      const newLevel = calculateLevel(newXp);

      const updateData: any = {
        xp: newXp,
        level: newLevel,
        dailyStreak: currentStreak,
        lastRewardClaimAt: now.toISOString(),
        totalRewardsClaimed: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (rewards.starterCredits > 0) updateData.starterCredits = admin.firestore.FieldValue.increment(rewards.starterCredits);
      if (rewards.premiumCredits > 0) updateData.premiumCredits = admin.firestore.FieldValue.increment(rewards.premiumCredits);
      if (rewards.rareBoost > 0) updateData.rareBoostCount = admin.firestore.FieldValue.increment(rewards.rareBoost);

      transaction.set(userRef, updateData, { merge: true });

      return { 
        success: true, 
        xpGain, 
        streak: currentStreak,
        rewards 
      };
    });

    await logEvent('api_success', `User ${userId} claimed daily reward`, { userId });
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('CRITICAL_DAILY_REWARD_ERROR:', error);
    await logError(`Daily Reward Failed: ${error.message}`, error, { userId });
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

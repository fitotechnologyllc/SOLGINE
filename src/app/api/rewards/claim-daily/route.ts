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

      // 2.1 COOLDOWN VERIFICATION (Inside Transaction)
      const lastClaim = userData.lastRewardClaimAt ? new Date(userData.lastRewardClaimAt) : null;
      const now = new Date();

      if (lastClaim && (now.getTime() - lastClaim.getTime()) < 24 * 60 * 60 * 1000) {
        const remaining = 24 * 60 * 60 * 1000 - (now.getTime() - lastClaim.getTime());
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        throw new Error(`COOLDOWN_ACTIVE: You can claim again in ${hours} hours.`);
      }

      // 2.2 ATOMIC INCREMENTS
      const oldXp = userData.xp || 0;
      const newXp = oldXp + 25;
      const newLevel = calculateLevel(newXp);

      transaction.set(userRef, {
        xp: newXp,
        level: newLevel,
        starterCredits: admin.firestore.FieldValue.increment(1),
        lastRewardClaimAt: now.toISOString(),
        totalRewardsClaimed: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return { 
        success: true, 
        xpGain: 25, 
        rewards: { starterCredits: 1 } 
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

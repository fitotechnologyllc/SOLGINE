import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { calculateLevel } from '@/lib/rewards';

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

    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};

    const lastClaim = userData.lastRewardClaimAt ? new Date(userData.lastRewardClaimAt) : null;
    const now = new Date();

    if (lastClaim && (now.getTime() - lastClaim.getTime()) < 24 * 60 * 60 * 1000) {
      const remaining = 24 * 60 * 60 * 1000 - (now.getTime() - lastClaim.getTime());
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      return NextResponse.json({ error: `You can claim again in ${hours} hours.` }, { status: 400 });
    }

    const oldXp = userData.xp || 0;
    const newXp = oldXp + 25;
    const newLevel = calculateLevel(newXp);

    const update = {
      xp: newXp,
      level: newLevel,
      starterCredits: (userData.starterCredits || 0) + 1,
      lastRewardClaimAt: now.toISOString(),
      totalRewardsClaimed: (userData.totalRewardsClaimed || 0) + 1,
      updatedAt: now.toISOString()
    };

    await userRef.set(update, { merge: true });

    return NextResponse.json({ 
      success: true, 
      xpGain: 25, 
      rewards: { starterCredits: 1 } 
    });

  } catch (error: any) {
    console.error('DAILY REWARD ERROR:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

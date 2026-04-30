import { NextResponse } from 'next/server';
import { adminDb, admin } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { missionId, userId } = await req.json();

    if (!missionId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!adminDb) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    const progressRef = adminDb.collection('missionProgress').doc(`${userId}_${missionId}`);
    const progressSnap = await progressRef.get();

    if (!progressSnap.exists) {
      return NextResponse.json({ error: 'Progress not found' }, { status: 404 });
    }

    const progress = progressSnap.data()!;
    if (!progress.completed) {
      return NextResponse.json({ error: 'Mission not completed' }, { status: 400 });
    }
    if (progress.claimed) {
      return NextResponse.json({ error: 'Reward already claimed' }, { status: 400 });
    }

    const missionSnap = await adminDb.collection('missions').doc(missionId).get();
    if (!missionSnap.exists) {
      return NextResponse.json({ error: 'Mission definition not found' }, { status: 404 });
    }

    const mission = missionSnap.data()!;
    const reward = mission.reward;

    const batch = adminDb.batch();

    // 1. Mark as claimed
    batch.update(progressRef, {
      claimed: true,
      claimedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Grant Reward
    const userRef = adminDb.collection('users').doc(userId);
    if (reward.type === 'xp') {
      batch.update(userRef, {
        xp: admin.firestore.FieldValue.increment(reward.amount)
      });
    } else if (reward.type === 'credit') {
      batch.update(userRef, {
        credits: admin.firestore.FieldValue.increment(reward.amount)
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Mission Claim Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

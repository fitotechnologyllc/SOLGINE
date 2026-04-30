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
    const { matchId } = body;

    const matchRef = adminDb.collection('matches').doc(matchId);
    const matchSnap = await matchRef.get();

    if (!matchSnap.exists) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    const match = matchSnap.data()!;

    if (match.userId !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (match.status !== 'active') return NextResponse.json({ error: 'Match is already over' }, { status: 400 });

    await matchRef.update({
      status: 'abandoned',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Abandon counts as a loss for stats
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    await userRef.set({
      battlesPlayed: (userSnap.data()?.battlesPlayed || 0) + 1,
      battlesLost: (userSnap.data()?.battlesLost || 0) + 1,
      xp: (userSnap.data()?.xp || 0) + 2, // Minimal XP for participation
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('BATTLE ABANDON ERROR:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

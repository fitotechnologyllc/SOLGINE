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
    const { deckId } = body;

    if (!deckId) {
      return NextResponse.json({ error: 'Deck ID is required' }, { status: 400 });
    }

    const deckRef = adminDb.collection('decks').doc(deckId);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    if (deckSnap.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await deckRef.delete();

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('DECK DELETE ERROR:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

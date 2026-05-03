import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { updateCardValueIndex } from '@/lib/economy';

export async function GET(req: Request) {
  // Simple auth check
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!adminDb) return NextResponse.json({ error: 'No DB' }, { status: 500 });

    const cardsSnap = await adminDb.collection('cards').get();
    const cardIds = cardsSnap.docs.map((doc: any) => doc.id);

    console.log(`Running Value Index update for ${cardIds.length} cards...`);

    for (const cardId of cardIds) {
      await updateCardValueIndex(cardId);
    }

    return NextResponse.json({ success: true, processed: cardIds.length });
  } catch (error: any) {
    console.error('Value index cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

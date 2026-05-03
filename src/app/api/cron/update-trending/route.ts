import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!adminDb) return NextResponse.json({ error: 'No DB' }, { status: 500 });

    const indexSnap = await adminDb.collection('cardValueIndex')
      .orderBy('trendingScore', 'desc')
      .limit(10)
      .get();

    const batch = adminDb.batch();
    
    // Clear old trending flags (simplified for now, ideally track in a 'trending' collection)
    // For now, we just rely on the score being updated by the value index job.
    
    return NextResponse.json({ 
      success: true, 
      trendingCards: indexSnap.docs.map((doc: any) => ({ id: doc.id, score: doc.data().trendingScore })) 
    });
  } catch (error: any) {
    console.error('Trending cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

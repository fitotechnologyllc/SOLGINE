import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  // Only allow in development or with a secret
  if (process.env.NODE_ENV === 'production' && process.env.DEV_SECRET !== 'solgine_dev_2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cardsToUpdate = [
    { name: 'Pulse Reaper', visualGradient: "from-zinc-900 via-slate-800 to-zinc-950" },
    { name: 'Void Walker', visualGradient: "from-purple-950 via-indigo-900 to-black" },
    { name: 'Celestial Dragon', visualGradient: "from-yellow-900 via-orange-800 to-black" },
    { name: 'Nova Guardian', visualGradient: "from-blue-950 via-cyan-900 to-black" },
    { name: 'Iron Phalanx', visualGradient: "from-slate-800 via-zinc-700 to-black" }
  ];

  try {
    const results = [];
    for (const card of cardsToUpdate) {
      const q = await adminDb.collection('cards').where('name', '==', card.name).get();
      
      if (!q.empty) {
        const docId = q.docs[0].id;
        await adminDb.collection('cards').doc(docId).update({
          visualGradient: card.visualGradient
        });
        results.push({ name: card.name, status: 'updated', id: docId });
      } else {
        results.push({ name: card.name, status: 'not_found' });
      }
    }

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

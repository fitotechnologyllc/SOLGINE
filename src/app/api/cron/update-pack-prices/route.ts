import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!adminDb) return NextResponse.json({ error: 'No DB' }, { status: 500 });

    const packsSnap = await adminDb.collection('boosterPacks').get();
    const packs = packsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    const batch = adminDb.batch();

    for (const pack of packs) {
      // Calculate average value of cards in each pack
      const rarityOdds = pack.rarityOdds || {};
      let totalValue = 0;
      let cardCount = 0;

      // For each rarity in the pack, get its current market average
      for (const [rarity, chance] of Object.entries(rarityOdds)) {
        const cardsSnap = await adminDb.collection('cardValueIndex')
          .where('rarity', '==', rarity)
          .get();
        
        if (!cardsSnap.empty) {
          const avgRarityValue = cardsSnap.docs.reduce((sum: number, doc: any) => sum + (doc.data().estimatedValue || 0), 0) / cardsSnap.size;
          totalValue += (avgRarityValue * (chance as number / 100));
        }
      }

      // newPrice = averagePackValue × (0.7 to 0.9)
      const packValue = totalValue * (pack.cardsPerPack || 1);
      const discountFactor = 0.7 + (Math.random() * 0.2); // 0.7 to 0.9
      const newPrice = Math.max(1, Math.round(packValue * discountFactor));

      batch.update(adminDb.collection('boosterPacks').doc(pack.id), {
        dynamicPrice: newPrice,
        lastPriceUpdate: new Date(),
        // For UI indicators
        priceTrend: newPrice > (pack.dynamicPrice || pack.price) ? 'rising' : 'falling'
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true, processed: packs.length });
  } catch (error: any) {
    console.error('Pack price cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

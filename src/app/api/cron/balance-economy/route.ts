import { NextResponse } from 'next/server';
import { adminDb, admin } from '@/lib/firebase-admin';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminDb) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    const startTime = Date.now();
    
    // 1. Fetch Global Economy Stats
    const economySnap = await adminDb.collection('systemStatus').doc('economy').get();
    const economyData = economySnap.exists ? economySnap.data() : { totalPacksOpened: 0 };
    
    // 2. Fetch Pack Openings in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOpensSnap = await adminDb.collection('packOpenings')
      .where('createdAt', '>=', oneHourAgo)
      .get();
    
    const velocity = recentOpensSnap.size; // Packs per hour
    const batch = adminDb.batch();

    // Target velocity: 50 packs per hour
    // If > 100 -> Over-inflation risk
    // If < 10 -> Dead economy risk

    const packsSnap = await adminDb.collection('boosterPacks').get();
    
    for (const doc of packsSnap.docs) {
      const pack = doc.data();
      let multiplier = 1.0;

      if (velocity > 100) {
        multiplier = 1.05; // Increase price by 5%
      } else if (velocity < 10 && velocity > 0) {
        multiplier = 0.95; // Decrease price by 5%
      }

      if (multiplier !== 1.0) {
        const currentDynamicPrice = pack.dynamicPrice || pack.price;
        const newPrice = Math.round(currentDynamicPrice * multiplier);
        
        // Clamp price to reasonable bounds (50% to 500% of base price)
        const clampedPrice = Math.max(
          Math.min(newPrice, pack.price * 5),
          Math.round(pack.price * 0.5)
        );

        batch.update(doc.ref, {
          dynamicPrice: clampedPrice,
          priceTrend: multiplier > 1 ? 'rising' : 'falling',
          lastBalancedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    await batch.commit();

    // Log Cron Health
    const duration = Date.now() - startTime;
    await adminDb.collection('cronLogs').add({
      job: 'balance-economy',
      velocity,
      duration,
      timestamp: new Date(),
      success: true
    });

    return NextResponse.json({ 
      success: true, 
      velocity,
      duration: `${duration}ms` 
    });

  } catch (error: any) {
    console.error('Economy Balancer Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

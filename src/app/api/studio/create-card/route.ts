import { NextResponse } from 'next/server';
import { adminDb, admin } from '@/lib/firebase-admin';
import { BASE_RARITY_VALUES } from '@/lib/economy';

export async function POST(req: Request) {
  try {
    const { 
      projectId, 
      ownerUid, 
      name, 
      rarity, 
      supplyLimit, 
      imageUrl, 
      attributes, 
      abilities 
    } = await req.json();

    if (!projectId || !ownerUid || !name || !rarity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!adminDb) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    // 1. Verify Project Ownership
    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!projectSnap.exists || projectSnap.data()?.ownerUid !== ownerUid) {
      return NextResponse.json({ error: 'Unauthorized: You do not own this project' }, { status: 403 });
    }

    const cardId = `${projectId}_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

    const cardData = {
      cardId,
      projectId,
      name,
      rarity: rarity.toLowerCase(),
      supplyLimit: supplyLimit ? parseInt(supplyLimit) : null,
      imageUrl,
      attributes: attributes || {},
      abilities: abilities || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const batch = adminDb.batch();

    // Create Card
    batch.set(adminDb.collection('cards').doc(cardId), cardData);

    // Initialize Value Index for this card
    batch.set(adminDb.collection('cardValueIndex').doc(cardId), {
      projectId,
      cardId,
      cardName: name,
      rarity: rarity.toLowerCase(),
      baseValue: BASE_RARITY_VALUES[rarity.toLowerCase()] || 2,
      floorPrice: 0,
      lastSale: 0,
      averageSale: 0,
      highestSale: 0,
      activeListings: 0,
      totalSales: 0,
      recentSales24h: 0,
      rollingSales: [],
      mintedCount: 0,
      supplyLimit: cardData.supplyLimit,
      demandScore: 0,
      scarcityScore: 100, // Starts at 100% scarce (0 minted)
      estimatedValue: BASE_RARITY_VALUES[rarity.toLowerCase()] || 2,
      priceChange24h: 0,
      volume24h: 0,
      trendingScore: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update Project Stats
    batch.set(adminDb.collection('projectStats').doc(projectId), {
      cardMintCount: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await batch.commit();

    return NextResponse.json({ success: true, cardId });

  } catch (error: any) {
    console.error('Card Creation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

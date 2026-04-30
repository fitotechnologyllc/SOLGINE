import { NextResponse } from 'next/server';
import { adminDb, admin } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { 
      projectId, 
      ownerUid, 
      name, 
      price, 
      description,
      rarityOdds,
      imageUrl,
      maxSupply
    } = await req.json();

    if (!projectId || !ownerUid || !name || !price || !rarityOdds) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!adminDb) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    // 1. Verify Project Ownership
    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!projectSnap.exists || projectSnap.data()?.ownerUid !== ownerUid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const packId = `${projectId}_pack_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

    const packData = {
      packId,
      projectId,
      name,
      description,
      price: parseFloat(price),
      dynamicPrice: parseFloat(price),
      imageUrl,
      rarityOdds, // Object e.g. { common: 0.7, rare: 0.2, epic: 0.1 }
      maxSupply: maxSupply ? parseInt(maxSupply) : null,
      soldCount: 0,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await adminDb.collection('boosterPacks').doc(packId).set(packData);

    return NextResponse.json({ success: true, packId });

  } catch (error: any) {
    console.error('Pack Creation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

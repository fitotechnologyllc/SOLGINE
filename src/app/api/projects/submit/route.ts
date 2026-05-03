import { NextResponse } from 'next/server';
import { adminDb, admin, adminAuth } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { projectId, applicationData } = await req.json();

    if (!projectId || !applicationData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projectSnap.data();
    if (project?.ownerUid !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (project?.status !== 'draft' && project?.status !== 'rejected') {
      return NextResponse.json({ error: 'Project is already submitted or live' }, { status: 400 });
    }

    // --- VALIDATION ---
    
    // 1. Check Cards
    const cardsSnap = await adminDb.collection('cards').where('projectId', '==', projectId).get();
    const cards = cardsSnap.docs.map((doc: any) => doc.data());

    if (cards.length < 10) {
      return NextResponse.json({ error: 'Project must have at least 10 cards.' }, { status: 400 });
    }

    for (const card of cards) {
      if (!card.name || !card.rarity || card.supplyLimit === undefined || card.attack === undefined || card.defense === undefined) {
        return NextResponse.json({ error: `Card "${card.name || 'Unknown'}" is missing required fields (rarity, supply, attack, defense).` }, { status: 400 });
      }
      if (card.supplyLimit === null || card.supplyLimit <= 0) {
        return NextResponse.json({ error: `Card "${card.name}" must have a valid positive supply limit.` }, { status: 400 });
      }
    }

    // 2. Check Booster Packs
    const packsSnap = await adminDb.collection('boosterPacks').where('projectId', '==', projectId).get();
    const packs = packsSnap.docs.map((doc: any) => doc.data());

    if (packs.length < 1) {
      return NextResponse.json({ error: 'Project must have at least 1 booster pack.' }, { status: 400 });
    }

    for (const pack of packs) {
      const odds = pack.rarityOdds || {};
      const totalOdds = Object.values(odds).reduce((sum: number, val: any) => sum + (val as number), 0);
      if (Math.abs(totalOdds - 100) > 0.01) {
        return NextResponse.json({ error: `Pack "${pack.name}" odds must total 100% (current: ${totalOdds}%).` }, { status: 400 });
      }
      if (!pack.name || !pack.description || !pack.price) {
        return NextResponse.json({ error: `Pack "${pack.name || 'Unknown'}" is missing required fields.` }, { status: 400 });
      }
    }

    // 3. Metadata validation
    if (!applicationData.projectName || !applicationData.description || !applicationData.category) {
      return NextResponse.json({ error: 'Application is missing core metadata.' }, { status: 400 });
    }

    // --- SUBMISSION ---

    const batch = adminDb.batch();

    // Update Project Status
    batch.update(projectRef, {
      status: 'submitted',
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectionReason: admin.firestore.FieldValue.delete(), // Clear old reason if resubmitting
      launchChecklistCompleted: true
    });

    // Create Application Document
    const appRef = adminDb.collection('projectApplications').doc(projectId);
    batch.set(appRef, {
      projectId,
      ownerUid: userId,
      ...applicationData,
      status: 'pending',
      cardCount: cards.length,
      packCount: packs.length,
      sampleCards: cards.slice(0, 5),
      packSummary: packs.map((p: any) => ({ name: p.name, price: p.price, odds: p.rarityOdds })),
      submittedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Project Submission Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

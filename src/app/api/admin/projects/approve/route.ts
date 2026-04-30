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

    // Verify Admin Role
    const userSnap = await adminDb.collection('users').doc(userId).get();
    if (userSnap.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { projectId, notes } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const projectRef = adminDb.collection('projects').doc(projectId);
    const appRef = adminDb.collection('projectApplications').doc(projectId);

    const batch = adminDb.batch();

    // Update Project Status to Approved
    batch.update(projectRef, {
      status: 'approved',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: userId,
      approvalNotes: notes || '',
      verifiedBadge: true,
      economyEnabled: true, // Economy turns on but project is not "live" yet
      marketplaceEnabled: true
    });

    // Update Application Status
    batch.update(appRef, {
      status: 'approved',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: userId
    });

    // Log Action
    batch.set(adminDb.collection('adminAuditLogs').doc(), {
      action: 'PROJECT_APPROVE',
      projectId,
      adminId: userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      notes
    });

    await batch.commit();

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Project Approval Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

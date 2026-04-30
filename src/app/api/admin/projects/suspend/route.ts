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

    const { projectId, reason } = await req.json();

    if (!projectId || !reason) {
      return NextResponse.json({ error: 'Missing projectId or reason' }, { status: 400 });
    }

    const projectRef = adminDb.collection('projects').doc(projectId);

    const batch = adminDb.batch();

    // Update Project Status to Suspended
    batch.update(projectRef, {
      status: 'suspended',
      publicVisibility: false,
      economyEnabled: false,
      marketplaceEnabled: false,
      rejectionReason: reason, // Reusing field for suspension reason
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log Action
    batch.set(adminDb.collection('adminAuditLogs').doc(), {
      action: 'PROJECT_SUSPEND',
      projectId,
      adminId: userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      reason
    });

    await batch.commit();

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Project Suspension Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    const { projectId } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
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

    if (project?.status !== 'approved') {
      return NextResponse.json({ error: 'Project must be approved before going live.' }, { status: 400 });
    }

    await projectRef.update({
      status: 'live',
      publicVisibility: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Project Go-Live Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

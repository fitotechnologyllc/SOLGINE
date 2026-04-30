import { NextResponse } from 'next/server';
import { adminDb, admin } from '@/lib/firebase-admin';
import { Project, ProjectConfig } from '@/lib/projects';

export async function POST(req: Request) {
  try {
    const { name, description, ownerUid, slug } = await req.json();

    if (!name || !ownerUid || !slug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!adminDb) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    // 1. Check if slug is unique
    const slugCheck = await adminDb.collection('projects').where('slug', '==', slug).get();
    if (!slugCheck.empty) {
      return NextResponse.json({ error: 'Project slug already exists' }, { status: 400 });
    }

    const projectId = slug; // Using slug as ID for cleaner URLs

    const projectConfig: ProjectConfig = {
      rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
      fees: {
        projectOwnerFeePercent: 0.10,
        platformFeePercent: 0.05
      },
      theme: {
        primaryColor: '#14F195',
        secondaryColor: '#9945FF'
      }
    };

    const projectData: Project = {
      projectId,
      name,
      slug,
      description,
      logoUrl: '', // Default or placeholder
      ownerUid,
      status: 'draft',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedBadge: false,
      publicVisibility: false,
      economyEnabled: false,
      marketplaceEnabled: false,
      launchChecklistCompleted: false,
      config: projectConfig
    };

    const batch = adminDb.batch();
    
    // Create Project
    batch.set(adminDb.collection('projects').doc(projectId), projectData);
    
    // Initialize Stats
    batch.set(adminDb.collection('projectStats').doc(projectId), {
      totalVolume: 0,
      activeUsers: 0,
      cardMintCount: 0,
      packOpenings: 0,
      revenueEarned: 0,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    // Initialize System Status for the project
    batch.set(adminDb.collection('systemStatus').doc(projectId), {
      projectId,
      tradingPaused: false,
      packsEnabled: true,
      mintingEnabled: true,
      affectedCardIds: [],
      reason: 'Initial setup',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    return NextResponse.json({ success: true, projectId });

  } catch (error: any) {
    console.error('Project Creation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

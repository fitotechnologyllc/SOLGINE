import { adminDb } from './firebase-admin';

export interface Project {
  projectId: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  ownerUid: string;
  status: 'draft' | 'submitted' | 'approved' | 'live' | 'rejected' | 'suspended';
  createdAt: any;
  submittedAt?: any;
  reviewedAt?: any;
  reviewedBy?: string;
  rejectionReason?: string;
  approvalNotes?: string;
  verifiedBadge?: boolean;
  publicVisibility?: boolean;
  economyEnabled?: boolean;
  marketplaceEnabled?: boolean;
  launchChecklistCompleted?: boolean;
  config: ProjectConfig;
}

export interface ProjectConfig {
  rarities: string[];
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily?: string;
  };
  fees: {
    projectOwnerFeePercent: number; // e.g. 0.10 for 10%
    platformFeePercent: number;    // e.g. 0.05 for 5% (SOLGINE GLOBAL)
  };
}

export interface ProjectStats {
  totalVolume: number;
  activeUsers: number;
  cardMintCount: number;
  packOpenings: number;
  revenueEarned: number;
  lastUpdated: any;
}

export const GLOBAL_PROJECT_ID = 'solgine-core';

/**
 * Ensures a project exists or initializes the core project.
 */
export async function ensureProject(projectId: string) {
  if (!adminDb) return null;
  const ref = adminDb.collection('projects').doc(projectId);
  const snap = await ref.get();
  return snap.exists ? snap.data() as Project : null;
}

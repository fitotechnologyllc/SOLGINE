import { adminDb, admin } from './firebase-admin';

export interface Referral {
  id: string;
  referrerUid: string;
  referredUid: string;
  status: 'pending' | 'completed';
  rewardType: 'pack' | 'credit';
  rewardAmount: number;
  createdAt: any;
  completedAt?: any;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'open_packs' | 'win_battles' | 'sell_card' | 'buy_card';
  target: number;
  reward: {
    type: 'xp' | 'credit' | 'pack';
    amount: number;
  };
  frequency: 'daily' | 'weekly';
}

export interface MissionProgress {
  userId: string;
  missionId: string;
  currentValue: number;
  completed: boolean;
  claimed: boolean;
  lastUpdated: any;
}

/**
 * Tracks mission progress for a user.
 */
export async function updateMissionProgress(
  userId: string, 
  type: Mission['type'], 
  increment: number = 1
) {
  if (!adminDb) return;

  const missionsSnap = await adminDb.collection('missions')
    .where('type', '==', type)
    .get();

  const batch = adminDb.batch();

  for (const missionDoc of missionsSnap.docs) {
    const mission = missionDoc.data() as Mission;
    const progressRef = adminDb.collection('missionProgress').doc(`${userId}_${missionDoc.id}`);
    const progressSnap = await progressRef.get();

    if (!progressSnap.exists) {
      batch.set(progressRef, {
        userId,
        missionId: missionDoc.id,
        currentValue: increment,
        completed: increment >= mission.target,
        claimed: false,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      const data = progressSnap.data()!;
      if (!data.completed) {
        const newVal = (data.currentValue || 0) + increment;
        batch.update(progressRef, {
          currentValue: newVal,
          completed: newVal >= mission.target,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  }

  await batch.commit();
}

/**
 * Initializes a referral for a new user.
 */
export async function processReferralSignup(referredUid: string, referralCode: string) {
  if (!adminDb) return;

  // Find referrer by code (assuming referralCode is the UID for simplicity, 
  // or we map codes to UIDs in a 'referralCodes' collection)
  const referrerSnap = await adminDb.collection('users').where('referralCode', '==', referralCode).limit(1).get();
  
  if (referrerSnap.empty) return;
  const referrerUid = referrerSnap.docs[0].id;

  await adminDb.collection('referrals').add({
    referrerUid,
    referredUid,
    status: 'pending',
    rewardType: 'pack',
    rewardAmount: 2,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

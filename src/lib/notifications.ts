import { db } from './firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, updateDoc, doc } from 'firebase/firestore';

export type NotificationType = 
  | 'pack_opened' 
  | 'rare_pull' 
  | 'item_sold' 
  | 'item_bought' 
  | 'mission_completed' 
  | 'referral_reward'
  | 'system';

interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: any;
}

export const sendNotification = async (data: NotificationData) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...data,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
};

export const getUnreadCount = async (userId: string) => {
  const q = query(
    collection(db, 'notifications'), 
    where('userId', '==', userId), 
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  return snap.size;
};

export const markAsRead = async (notificationId: string) => {
  const ref = doc(db, 'notifications', notificationId);
  await updateDoc(ref, { read: true });
};

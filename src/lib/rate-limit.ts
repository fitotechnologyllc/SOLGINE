import { adminDb } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * Atomic rate limiter using Firestore Transactions.
 * Prevents "burst" bypasses where multiple concurrent requests pass the check before the first increment.
 */
export const checkRateLimit = async (userId: string, action: string, limit: number, windowSeconds: number) => {
  if (!adminDb) return true;

  const routeKey = action.replace(/\//g, '_');
  const limitRef = adminDb.collection('rateLimits').doc(`${routeKey}_${userId}`);

  try {
    const result = await adminDb.runTransaction(async (transaction: any) => {
      const limitDoc = await transaction.get(limitRef);
      const now = Date.now();

      if (!limitDoc.exists) {
        transaction.set(limitRef, {
          count: 1,
          startTime: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromMillis(now + windowSeconds * 1000)
        });
        return true;
      }

      const data = limitDoc.data()!;
      const startTime = data.startTime.toDate().getTime();

      // Check if window has expired
      if (now - startTime > windowSeconds * 1000) {
        transaction.update(limitRef, {
          count: 1,
          startTime: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromMillis(now + windowSeconds * 1000)
        });
        return true;
      }

      // Check if limit exceeded
      if (data.count >= limit) {
        return false;
      }

      // Increment atomically
      transaction.update(limitRef, {
        count: FieldValue.increment(1)
      });
      return true;
    });

    return result;
  } catch (error) {
    console.error('RATE_LIMIT_ERROR:', error);
    // Fail safe: allow the request if rate limiting service is down? 
    // For SOLGINE, we fail closed for security.
    return false;
  }
};

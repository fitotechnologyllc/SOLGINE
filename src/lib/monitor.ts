import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type LogType = 'api_success' | 'api_error' | 'pack_open' | 'transaction' | 'auth_event' | 'performance';

interface LogOptions {
  userId?: string;
  projectId?: string;
  metadata?: any;
}

export const logEvent = async (type: LogType, message: string, options: LogOptions = {}) => {
  try {
    await addDoc(collection(db, 'systemLogs'), {
      type,
      message,
      userId: options.userId || 'system',
      projectId: options.projectId || 'global',
      metadata: options.metadata || {},
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log event:', error);
  }
};

export const logError = async (message: string, error: any, options: LogOptions = {}) => {
  try {
    await addDoc(collection(db, 'errorLogs'), {
      message,
      error: error?.message || String(error),
      stack: error?.stack || null,
      userId: options.userId || 'system',
      projectId: options.projectId || 'global',
      metadata: options.metadata || {},
      timestamp: serverTimestamp(),
    });
    
    // Check if we should trigger an "alert" (simple implementation: if error message is critical)
    if (message.toLowerCase().includes('critical') || message.toLowerCase().includes('fail')) {
      await addDoc(collection(db, 'systemAlerts'), {
        severity: 'high',
        message: `CRITICAL ERROR: ${message}`,
        timestamp: serverTimestamp(),
        resolved: false
      });
    }
  } catch (err) {
    console.error('Failed to log error:', err);
  }
};

export const trackLatency = async (name: string, durationMs: number, options: LogOptions = {}) => {
  if (durationMs > 2000) {
    await logEvent('performance', `High Latency Detected: ${name}`, {
      ...options,
      metadata: { ...options.metadata, durationMs }
    });
  }
};

import { db as clientDb } from './firebase';
import { adminDb } from './firebase-admin';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { FieldValue } from 'firebase-admin/firestore';

export type LogType = 'api_success' | 'api_error' | 'pack_open' | 'transaction' | 'auth_event' | 'performance';

interface LogOptions {
  userId?: string;
  projectId?: string;
  metadata?: any;
}

export const logEvent = async (type: LogType, message: string, options: LogOptions = {}) => {
  const isServer = typeof window === 'undefined';
  
  try {
    const logData = {
      type,
      message,
      userId: options.userId || 'system',
      projectId: options.projectId || 'global',
      metadata: options.metadata || {},
      timestamp: isServer ? (FieldValue.serverTimestamp() as any) : serverTimestamp(),
    };

    if (isServer && adminDb) {
      await adminDb.collection('systemLogs').add(logData);
    } else if (!isServer && clientDb) {
      await addDoc(collection(clientDb, 'systemLogs'), logData);
    }
  } catch (error) {
    console.error('Failed to log event:', error);
  }
};

export const logError = async (message: string, error: any, options: LogOptions = {}) => {
  const isServer = typeof window === 'undefined';
  
  try {
    const errorData = {
      message,
      error: error?.message || String(error),
      stack: error?.stack || null,
      userId: options.userId || 'system',
      projectId: options.projectId || 'global',
      metadata: options.metadata || {},
      timestamp: isServer ? (FieldValue.serverTimestamp() as any) : serverTimestamp(),
    };

    if (isServer && adminDb) {
      await adminDb.collection('errorLogs').add(errorData);
      
      if (message.toLowerCase().includes('critical') || message.toLowerCase().includes('fail')) {
        await adminDb.collection('systemAlerts').add({
          severity: 'high',
          message: `CRITICAL ERROR: ${message}`,
          timestamp: FieldValue.serverTimestamp(),
          resolved: false
        });
      }
    } else if (!isServer && clientDb) {
      await addDoc(collection(clientDb, 'errorLogs'), errorData);
      
      if (message.toLowerCase().includes('critical') || message.toLowerCase().includes('fail')) {
        await addDoc(collection(clientDb, 'systemAlerts'), {
          severity: 'high',
          message: `CRITICAL ERROR: ${message}`,
          timestamp: serverTimestamp(),
          resolved: false
        });
      }
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

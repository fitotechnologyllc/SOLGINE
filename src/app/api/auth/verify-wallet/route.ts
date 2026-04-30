import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import * as nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import { decodeUTF8 } from 'tweetnacl-util';

export async function POST(req: Request) {
  try {
    if (!adminDb || !adminAuth) {
      console.warn("SERVER_FIREBASE_ADMIN_NOT_CONFIGURED");
      return NextResponse.json({ error: 'Server authentication module not configured' }, { status: 500 });
    }

    const { publicKey, signature, message, userId } = await req.json();

    if (!publicKey || !signature || !message || !userId) {
      return NextResponse.json({ error: 'Missing verification data' }, { status: 400 });
    }

    // 1. Verify signature
    const signatureUint8 = new Uint8Array(Object.values(signature));
    const messageUint8 = decodeUTF8(message);
    const pubKeyUint8 = new PublicKey(publicKey).toBytes();

    const verified = nacl.sign.detached.verify(
      messageUint8,
      signatureUint8,
      pubKeyUint8
    );

    if (!verified) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 2. Link wallet to user in Firestore
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      walletAddress: publicKey,
      status: 'verified'
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Wallet verification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

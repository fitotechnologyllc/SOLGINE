import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { adminDb as db } from '@/lib/firebase-admin';
import { logEvent, logError } from '@/lib/monitor';
import { sendNotification } from '@/lib/notifications';
import { FieldValue } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      await handleSuccessfulCheckout(session);
      break;
    case 'payment_intent.payment_failed':
      const failure = event.data.object as Stripe.PaymentIntent;
      await logError('Payment Intent Failed', failure, { metadata: { paymentIntentId: failure.id } });
      break;
    case 'charge.refunded':
      const refund = event.data.object as Stripe.Charge;
      await logEvent('refund', `Refund processed for charge ${refund.id}`, { metadata: { amount: refund.amount_refunded / 100 } });
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleSuccessfulCheckout(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const itemIds = JSON.parse(session.metadata?.items || '[]');
  const amountTotal = (session.amount_total || 0) / 100;

  if (!userId) {
    await logError('Webhook: No userId in session metadata', session);
    return;
  }

  try {
    const batch = db.batch();
    const userRef = db.collection('users').doc(userId);
    
    // Grant credits or packs based on items
    // Simple implementation: grant pack credits
    const updates: any = {};
    itemIds.forEach((id: string) => {
      if (id.includes('starter')) updates['starterCredits'] = FieldValue.increment(1);
      else if (id.includes('premium')) updates['premiumCredits'] = FieldValue.increment(1);
      else updates['standardCredits'] = FieldValue.increment(1);
    });

    batch.update(userRef, updates);

    // Track Revenue
    const treasuryRef = db.collection('treasury').doc('global');
    batch.set(treasuryRef, {
      totalRevenue: FieldValue.increment(amountTotal),
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });

    // Log Transaction
    const txRef = db.collection('transactions').doc();
    batch.set(txRef, {
      type: 'fiat_purchase',
      userId,
      amount: amountTotal,
      items: itemIds,
      stripeSessionId: session.id,
      timestamp: FieldValue.serverTimestamp()
    });

    await batch.commit();

    // Notify User
    // We'll use a wrapper since sendNotification might be client-side only in its current file
    // I'll make sure sendNotification works in server context too or use admin sdk directly
    await db.collection('notifications').add({
      userId,
      type: 'pack_opened',
      title: 'PURCHASE_SUCCESSFUL',
      message: `Grid synced. ${itemIds.length} packs added to your inventory.`,
      read: false,
      createdAt: FieldValue.serverTimestamp()
    });

    await logEvent('transaction', `Successful Stripe checkout: ${amountTotal} USD`, { userId });

  } catch (error) {
    await logError('Webhook: Failed to process checkout', error, { userId });
  }
}

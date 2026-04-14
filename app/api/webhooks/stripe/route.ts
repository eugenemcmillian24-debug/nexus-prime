import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err: any) {
    console.error('Webhook Error:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle Checkout Completion
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, credits, tier } = session.metadata || {};

    if (!userId || !credits) {
      console.error('Webhook Missing Metadata:', session.id);
      return NextResponse.json({ error: 'Missing Metadata' }, { status: 400 });
    }

    // 1. Log the Purchase
    // This will trigger the SQL trigger 'on_credit_purchase_success' 
    // to automatically add credits to user_credits.balance.
    const { error: purchaseError } = await supabase
      .from('credit_purchases')
      .insert({
        user_id: userId,
        amount_usd: (session.amount_total || 0) / 100,
        credits_added: parseInt(credits),
        stripe_payment_intent_id: session.payment_intent as string || session.id,
        status: 'succeeded' // Set to succeeded to trigger the balance update
      });

    if (purchaseError) {
      console.error('Purchase Log Error:', purchaseError);
      return NextResponse.json({ error: 'Failed to log purchase' }, { status: 500 });
    }

    // 2. Update the user tier
    await supabase
      .from('user_credits')
      .update({ tier })
      .eq('user_id', userId);
  }

  return NextResponse.json({ received: true });
}

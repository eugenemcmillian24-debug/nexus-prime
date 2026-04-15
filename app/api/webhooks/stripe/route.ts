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

// Credit mapping by price ID
const PRICE_TO_PLAN: Record<string, { tier: string; credits: number }> = {
  [process.env.STRIPE_STARTER_PRICE_ID!]: { tier: 'Starter', credits: 100 },
  [process.env.STRIPE_PRO_PRICE_ID!]: { tier: 'PRO', credits: 500 },
  [process.env.STRIPE_ENTERPRISE_PRICE_ID!]: { tier: 'Enterprise', credits: 2000 },
};

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── Checkout completed ────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, credits, tier } = session.metadata || {};

        if (!userId || !credits) {
          console.error('Missing metadata on checkout session:', session.id);
          break;
        }

        // Store Stripe customer ID
        if (session.customer) {
          await supabase
            .from('user_credits')
            .update({
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
            })
            .eq('user_id', userId);
        }

        // Log subscription in subscriptions table
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await supabase.from('subscriptions').upsert({
            user_id: userId,
            stripe_subscription_id: sub.id,
            stripe_customer_id: sub.customer as string,
            stripe_price_id: sub.items.data[0]?.price.id,
            tier: tier,
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          }, { onConflict: 'stripe_subscription_id' });
        }

        // Log purchase (triggers auto credit add via DB trigger)
        await supabase.from('credit_purchases').insert({
          user_id: userId,
          amount_usd: (session.amount_total || 0) / 100,
          credits_added: parseInt(credits),
          stripe_payment_intent_id: session.payment_intent as string || session.id,
          stripe_subscription_id: session.subscription as string,
          status: 'succeeded',
        });

        // Update tier
        await supabase
          .from('user_credits')
          .update({ tier })
          .eq('user_id', userId);

        break;
      }

      // ── Subscription updated (renewal, plan change, etc.) ─
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id;
        const plan = PRICE_TO_PLAN[priceId];

        // Update subscription record
        await supabase.from('subscriptions').upsert({
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer as string,
          stripe_price_id: priceId,
          tier: plan?.tier || 'Starter',
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' });

        // Update user tier
        if (plan) {
          await supabase
            .from('user_credits')
            .update({ tier: plan.tier })
            .eq('stripe_subscription_id', sub.id);
        }

        break;
      }

      // ── Subscription deleted (canceled/expired) ───────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;

        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);

        // Downgrade to free
        await supabase
          .from('user_credits')
          .update({ tier: 'free', stripe_subscription_id: null })
          .eq('stripe_subscription_id', sub.id);

        break;
      }

      // ── Invoice paid (recurring billing success) ──────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason === 'subscription_cycle') {
          const subId = invoice.subscription as string;
          const sub = await stripe.subscriptions.retrieve(subId);
          const priceId = sub.items.data[0]?.price.id;
          const plan = PRICE_TO_PLAN[priceId];

          if (plan) {
            // Find user by subscription ID
            const { data: userCredit } = await supabase
              .from('user_credits')
              .select('user_id')
              .eq('stripe_subscription_id', subId)
              .single();

            if (userCredit) {
              // Add recurring credits
              await supabase.from('credit_purchases').insert({
                user_id: userCredit.user_id,
                amount_usd: (invoice.amount_paid || 0) / 100,
                credits_added: plan.credits,
                stripe_payment_intent_id: invoice.payment_intent as string,
                stripe_subscription_id: subId,
                status: 'succeeded',
              });
            }
          }
        }
        break;
      }

      // ── Payment failed ────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;

        if (subId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', subId);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`Error processing ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

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

const TOPUP_PRICE_TO_CREDITS: Record<string, number> = {
  [process.env.STRIPE_TOPUP_50_PRICE_ID!]: 50,
  [process.env.STRIPE_TOPUP_250_PRICE_ID!]: 250,
  [process.env.STRIPE_TOPUP_1000_PRICE_ID!]: 1000,
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
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, credits, type, tier } = session.metadata || {};

        if (!userId || !credits) {
          console.error('Missing metadata on checkout session:', session.id);
          break;
        }

        // 1. Update Customer ID
        if (session.customer) {
          await supabase
            .from('user_credits')
            .update({ stripe_customer_id: session.customer as string })
            .eq('user_id', userId);
        }

        // 2. Handle Subscription specific logic
        if (type === 'subscription' && session.subscription) {
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

          // Update tier in user_credits
          await supabase
            .from('user_credits')
            .update({ tier, stripe_subscription_id: sub.id })
            .eq('user_id', userId);
        }

        // 3. Grant Credits (Atomic via RPC)
        const description = type === 'subscription' ? `Plan Upgrade: ${tier}` : `Top-up: ${credits} CR`;
        await supabase.rpc('add_user_credits', {
          target_user_id: userId,
          amount_to_add: parseInt(credits),
          transaction_type: 'purchase',
          transaction_desc: description,
          session_id: session.id
        });

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
              // Add recurring credits - record purchase
              await supabase.from('credit_purchases').insert({
                user_id: userCredit.user_id,
                amount_usd: (invoice.amount_paid || 0) / 100,
                credits_added: plan.credits,
                stripe_payment_intent_id: invoice.payment_intent as string,
                stripe_subscription_id: subId,
                status: 'succeeded',
              });

              // Actually credit the user's balance
              await supabase.rpc('add_user_credits', {
                target_user_id: userCredit.user_id,
                amount_to_add: plan.credits,
                transaction_type: 'subscription_renewal',
                transaction_desc: `Monthly renewal: ${plan.tier} plan`,
                session_id: invoice.id
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

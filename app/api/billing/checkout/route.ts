import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/api';
import { CheckoutSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { isNexusPrimeAdmin } from '@/lib/nexus_prime_access';
import { errorResponse } from '@/lib/apiError';

// Lazy-init Stripe so a missing secret key only fails at request time, not
// at build time (Vercel's static analysis runs route modules during build).
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured. Add it to your environment variables.');
  return new Stripe(key, { apiVersion: '2023-10-16' as any });
}

type SubscriptionTier = 'Starter' | 'PRO' | 'Enterprise';
type TopupPackId = 'pack_50' | 'pack_250' | 'pack_1000';

const SUBSCRIPTION_PRICE_ENV: Record<SubscriptionTier, { envVar: string; credits: number }> = {
  Starter: { envVar: 'STRIPE_STARTER_PRICE_ID', credits: 100 },
  PRO: { envVar: 'STRIPE_PRO_PRICE_ID', credits: 500 },
  Enterprise: { envVar: 'STRIPE_ENTERPRISE_PRICE_ID', credits: 2000 },
};

const TOPUP_PRICE_ENV: Record<TopupPackId, { envVar: string; credits: number }> = {
  pack_50: { envVar: 'STRIPE_TOPUP_50_PRICE_ID', credits: 50 },
  pack_250: { envVar: 'STRIPE_TOPUP_250_PRICE_ID', credits: 250 },
  pack_1000: { envVar: 'STRIPE_TOPUP_1000_PRICE_ID', credits: 1000 },
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not configured. Set it in the Vercel project environment variables to enable Stripe checkout.`,
    );
  }
  return value;
}

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = user.id;

    const rawBody = await req.json().catch(() => ({}));
    const parsed = CheckoutSchema.parse(rawBody);

    // Admin / superuser bypass — do not open a Stripe session at all. This is
    // intentional: admin accounts have unlimited credits granted at the DB
    // layer, so charging them would be a bug.
    if (await isNexusPrimeAdmin()) {
      const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
      return NextResponse.json({
        url: `${base}/success?status=admin_upgrade`,
        message: 'Admin status detected. Unlimited build credits active.',
      });
    }

    let mode: Stripe.Checkout.SessionCreateParams.Mode;
    let priceId: string;
    let credits: number;
    const metadata: Record<string, string> = { userId, type: parsed.type };

    if (parsed.type === 'subscription') {
      mode = 'subscription';
      const cfg = SUBSCRIPTION_PRICE_ENV[parsed.tier];
      priceId = requireEnv(cfg.envVar);
      credits = cfg.credits;
      metadata.tier = parsed.tier;
    } else {
      mode = 'payment';
      const cfg = TOPUP_PRICE_ENV[parsed.packId];
      priceId = requireEnv(cfg.envVar);
      credits = cfg.credits;
      metadata.packId = parsed.packId;
    }

    metadata.credits = credits.toString();

    const base = requireEnv('NEXT_PUBLIC_BASE_URL');
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?checkout=cancelled`,
      metadata,
      customer_email: user.email,
      client_reference_id: userId,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Input Validation Failed', details: err.errors },
        { status: 400 },
      );
    }
    // Missing env-var misconfiguration: return 503 with the specific var name
    // so operators can fix it without tailing logs. Does not leak secrets.
    if (err instanceof Error && /is not configured/.test(err.message)) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    // Stripe API errors carry a `type` field — surface a sanitized version
    // so the UI can show "card_declined" / "api_connection_error" without
    // exposing the raw message (which can include amounts, tokens, etc).
    if (err && typeof err === 'object' && 'type' in err && typeof (err as any).type === 'string') {
      const stripeType = String((err as any).type);
      return NextResponse.json(
        { error: `Stripe error: ${stripeType}` },
        { status: 502 },
      );
    }
    return errorResponse(err, 'billing/checkout');
  }
}

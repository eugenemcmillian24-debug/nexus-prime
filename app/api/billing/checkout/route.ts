import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/api';
import { CheckoutSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { isNexusPrimeAdmin } from '@/lib/nexus_prime_access';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    const body = await req.json();

    // 1. INPUT VALIDATION
    // Support for both 'subscription' and 'topup' modes
    const { type, tier, packId } = body; 

    // 2. CHECK ADMIN/SUPERUSER BYPASS
    const isAdmin = await isNexusPrimeAdmin();
    if (isAdmin) {
      return NextResponse.json({ 
        url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?status=admin_upgrade`,
        message: 'Admin status detected. Unlimited build credits activated.'
      });
    }

    let mode: Stripe.Checkout.SessionCreateParams.Mode = 'subscription';
    let priceId = '';
    let credits = 0;
    let metadata: any = { userId, type };

    if (type === 'subscription') {
      mode = 'subscription';
      metadata.tier = tier;
      switch (tier) {
        case 'Starter':
          priceId = process.env.STRIPE_STARTER_PRICE_ID!;
          credits = 100;
          break;
        case 'PRO':
          priceId = process.env.STRIPE_PRO_PRICE_ID!;
          credits = 500;
          break;
        case 'Enterprise':
          priceId = process.env.STRIPE_ENTERPRISE_PRICE_ID!;
          credits = 2000;
          break;
        default:
          return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
      }
    } else if (type === 'topup') {
      mode = 'payment';
      metadata.packId = packId;
      switch (packId) {
        case 'pack_50':
          priceId = process.env.STRIPE_TOPUP_50_PRICE_ID!;
          credits = 50;
          break;
        case 'pack_250':
          priceId = process.env.STRIPE_TOPUP_250_PRICE_ID!;
          credits = 250;
          break;
        case 'pack_1000':
          priceId = process.env.STRIPE_TOPUP_1000_PRICE_ID!;
          credits = 1000;
          break;
        default:
          return NextResponse.json({ error: 'Invalid pack' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid checkout type' }, { status: 400 });
    }

    metadata.credits = credits.toString();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
      metadata,
      customer_email: user.email,
    });


    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Input Validation Failed', details: err.errors },
        { status: 400 }
      );
    }
    console.error('Checkout Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

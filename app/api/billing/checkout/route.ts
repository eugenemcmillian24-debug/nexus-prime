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

    // 1. INPUT VALIDATION (Zod Hardening)
    // We ensure the userId used is the authenticated one
    const { tier } = CheckoutSchema.parse({ ...body, userId: user.id });

    // 2. CHECK ADMIN/SUPERUSER BYPASS
    const isAdmin = await isNexusPrimeAdmin();
    if (isAdmin) {
      // For Admins, we don't create a Stripe session, just return a "Direct Upgrade"
      // We can handle this logic in the frontend or just return a special URL
      return NextResponse.json({ 
        url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?status=admin_upgrade`,
        message: 'Admin status detected. Unlimited build credits activated.'
      });
    }


    // NEXUS PRIME Pricing Model:
    // Starter: $9/mo (100 credits)
    // PRO: $29/mo (500 credits)
    // Enterprise: $99/mo (2000 credits)
    
    let priceId = '';
    let credits = 0;

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
        return NextResponse.json({ error: 'Invalid tier selection' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
      metadata: {
        userId,
        credits: credits.toString(),
        tier,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Input Validation Failed', details: err.errors },
        { status: 400 }
      );
    }
    console.error('Checkout Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

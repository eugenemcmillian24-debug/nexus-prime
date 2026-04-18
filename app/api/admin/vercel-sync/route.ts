import { NextResponse } from 'next/server';
import { isNexusPrimeAdmin } from '@/lib/nexus_prime_access';

// TOKEN AND PROJECT ID EXTRACTED FROM SYSTEM INTEGRATION STATUS
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;

export async function GET() {
  try {
    const isAdmin = await isNexusPrimeAdmin();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const res = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env`, {
      headers: { "Authorization": `Bearer ${VERCEL_TOKEN}` }
    });

    if (!res.ok) throw new Error("Failed to fetch Vercel envs");

    const data = await res.json();
    return NextResponse.json({ envs: data.envs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const isAdmin = await isNexusPrimeAdmin();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sync } = await req.json();
    if (!sync) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    // SYNC SEQUENCE: 1. Update/Add New Price IDs 2. Enable Unthrottled Pipeline
    const newEnvs = [
      { key: 'STRIPE_TOPUP_50_PRICE_ID', value: 'price_topup_50_...placeholder' },
      { key: 'STRIPE_TOPUP_250_PRICE_ID', value: 'price_topup_250_...placeholder' },
      { key: 'STRIPE_TOPUP_1000_PRICE_ID', value: 'price_topup_1000_...placeholder' },
      { key: 'NEXUS_UNTHROTTLED_BUILD', value: 'true' },
    ];

    for (const env of newEnvs) {
      await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          key: env.key,
          value: env.value,
          type: 'plain',
          target: ['production', 'preview', 'development']
        })
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

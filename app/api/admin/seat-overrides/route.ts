import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';
import { isNexusPrimeAdmin } from '@/lib/nexus_prime_access';

export async function GET() {
  try {
    const isAdmin = await isNexusPrimeAdmin();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_credits')
      .select('user_id, seat_limit_override')
      .not('seat_limit_override', 'is', null);

    if (error) throw error;

    return NextResponse.json({ 
      overrides: data.map(d => ({ userId: d.user_id, seats: d.seat_limit_override })) 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const isAdmin = await isNexusPrimeAdmin();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId, seats } = await req.json();
    if (!userId || !seats) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const supabase = createClient();
    const { error } = await supabase
      .from('user_credits')
      .update({ seat_limit_override: seats })
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

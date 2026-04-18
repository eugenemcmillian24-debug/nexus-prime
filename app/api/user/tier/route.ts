import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';
import { TIER_LIMITS } from '@/lib/nexus_prime_access';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_credits')
      .select('tier, seat_limit_override')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    const tier = data?.tier || 'Free';
    const seatLimit = data?.seat_limit_override || (TIER_LIMITS as any)[tier]?.seats || 1;

    return NextResponse.json({ tier, seatLimit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

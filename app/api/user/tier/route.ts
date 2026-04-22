import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';
import { TIER_LIMITS } from '@/lib/nexus_prime_access';

export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('user_credits')
      .select('tier, seat_limit_override')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;

    const tier = data?.tier || 'Free';
    const seatLimit = data?.seat_limit_override || (TIER_LIMITS as any)[tier]?.seats || 1;

    return NextResponse.json({ tier, seatLimit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

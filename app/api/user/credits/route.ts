import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';
import { errorResponse } from '@/lib/apiError';

/**
 * GET /api/user/credits
 *
 * Returns the caller's user_credits row. Client components should call this
 * instead of querying `user_credits` directly via the browser supabase client
 * — that pattern was silently failing for users whose ad-hoc browser client
 * had no auth session, rendering every admin/PRO user as "Free • User / 0 CR".
 */
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_credits')
      .select('tier, balance, lifetime_credits, agency_mode, agency_config, seat_limit_override')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      credits: data ?? { tier: 'Free', balance: 0, lifetime_credits: 0 },
    });
  } catch (error) {
    return errorResponse(error, 'GET /api/user/credits');
  }
}

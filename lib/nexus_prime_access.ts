import 'server-only';
import { createClient } from './supabase/server';
import { TIER_LIMITS, PREMIUM_AGENTS } from './nexus_prime_constants';
import { isAdminEmail } from './admin_config';

export { TIER_LIMITS, PREMIUM_AGENTS };

/**
 * NEXUS PRIME Superuser & Admin Logic
 * This utility provides checks for administrative status and "Free" plan access.
 */

export async function isNexusPrimeAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  // 1. STRICT SUPERUSER OVERRIDE (Env Var - Primary Source of Truth)
  if (isAdminEmail(user.email)) return true;

  // 2. DATABASE CHECK (Secondary Fallback)
  const { data: credits } = await supabase
    .from('user_credits')
    .select('tier')
    .eq('user_id', user.id)
    .single();

  return credits?.tier === 'admin';
}



export async function hasNexusPrimeFreeAccess() {
  // Free access has been deprecated. All users must pay.
  // Only Admins retain unrestricted access.
  return await isNexusPrimeAdmin();
}

/**
 * Get available credits for the user
 * Returns Infinity for Admins/Superusers
 */
export async function getNexusPrimeCredits() {
  const isAdmin = await isNexusPrimeAdmin();
  if (isAdmin) return Infinity;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: profile } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', user.id)
    .single();

  return profile?.balance || 0;
}

export async function getTeamSeatLimit(userId: string, tier: string) {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('user_credits')
    .select('seat_limit_override')
    .eq('user_id', userId)
    .single();

  if (profile?.seat_limit_override) return profile.seat_limit_override;
  return (TIER_LIMITS as any)[tier]?.seats || 1;
}

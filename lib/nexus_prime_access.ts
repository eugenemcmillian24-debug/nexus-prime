import { createClient } from './supabase/server';

/**
 * NEXUS PRIME Superuser & Admin Logic
 * This utility provides checks for administrative status and "Free" plan access.
 */

export async function isNexusPrimeAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  // Check for admin role in metadata or a specific admin list
  // The user can be manually flagged as 'admin' in Supabase Auth user_metadata
  const isAdmin = user.app_metadata?.role === 'admin' || user.user_metadata?.is_admin === true;
  
  // Also, for the current setup, we can define a list of "Superuser" IDs
  const superuserEmails = ['admin@nexus-prime.ai', 'eugenemcmillian24@gmail.com']; // Placeholder for user's email if known, or just allow based on key
  
  return isAdmin || superuserEmails.includes(user.email || '');
}

export async function hasNexusPrimeFreeAccess() {
  const isAdmin = await isNexusPrimeAdmin();
  if (isAdmin) return true; // Admins always have free access

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Check for "Free Plan" flag in metadata
  return user.app_metadata?.plan === 'free_admin';
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
    .from('profiles')
    .select('credits')
    .eq('id', user.id)
    .single();

  return profile?.credits || 0;
}

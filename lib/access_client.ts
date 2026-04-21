import { User } from "@supabase/supabase-js";

/**
 * Client-side admin check.
 * Use this only in Client Components.
 */
export function checkIsAdmin(user: User | null) {
  if (!user) return false;

  const isAdmin = user.app_metadata?.role === 'admin' || user.user_metadata?.is_admin === true;
  const superuserEmails = ['eugenemcmillian9@gmail.com'];

  return isAdmin || superuserEmails.includes(user.email || '');
}

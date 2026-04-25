import { User } from "@supabase/supabase-js";

/**
 * Client-side admin check.
 * Use this only in Client Components.
 */
export function checkIsAdmin(user: User | null) {
  if (!user) return false;

  // 1. Env Var Check (Consistent with server-side override)
  const adminAccess = process.env.NEXT_PUBLIC_ADMIN_ACCESS || process.env.ADMIN_ACCESS || '';
  const superuserEmails = adminAccess.split(',').map(email => email.trim()).filter(Boolean);
  if (superuserEmails.includes(user.email || '')) return true;

  // 2. Metadata Check
  return user.app_metadata?.role === 'admin' || user.user_metadata?.is_admin === true;
}

import { User } from "@supabase/supabase-js";
import { isAdminEmail } from "./admin_config";

/**
 * Client-side admin check.
 * Use this only in Client Components.
 */
export function checkIsAdmin(user: User | null) {
  if (!user) return false;

  // 1. Env Var Check (Consistent with server-side override)
  if (isAdminEmail(user.email)) return true;

  // 2. Metadata Check
  return user.app_metadata?.role === 'admin' || user.user_metadata?.is_admin === true;
}

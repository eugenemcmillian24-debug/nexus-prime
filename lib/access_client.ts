import { User } from "@supabase/supabase-js";
import { isAdminEmail } from "./admin_config";

/**
 * Client-side admin check.
 * Use this only in Client Components.
 */
export function checkIsAdmin(user: User | null) {
  if (!user) return false;

  // 1. Env Var Check (Primary Source of Truth via NEXT_PUBLIC_ADMIN_ACCESS)
  return isAdminEmail(user.email);
}

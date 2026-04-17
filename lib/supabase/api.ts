import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

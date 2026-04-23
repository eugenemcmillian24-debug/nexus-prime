import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | undefined

/**
 * Returns the shared browser Supabase client (singleton).
 *
 * All client-side code MUST import from this module instead of calling
 * `createClient` from `@supabase/supabase-js` directly. Direct calls spin up
 * independent GoTrueClient instances that do not share the auth cookie, which
 * (a) triggers the "Multiple GoTrueClient instances detected" warning and
 * (b) causes RLS-scoped queries to silently return null because the ad-hoc
 * client is unauthenticated.
 */
export function createClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
    }
    return createBrowserClient(url, key)
  }

  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
    }
    browserClient = createBrowserClient(url, key)
  }
  return browserClient
}

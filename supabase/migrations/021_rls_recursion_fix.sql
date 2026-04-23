-- ============================================================
-- 021_rls_recursion_fix.sql
--
-- Fixes a P0 production bug introduced by migration 020.
--
-- Migration 020 re-created the "Admins can manage all credits" RLS
-- policy on public.user_credits with a USING clause that SELECTs from
-- public.user_credits itself:
--
--   USING (
--     auth.jwt() ->> 'role' = 'service_role'
--     OR EXISTS (
--       SELECT 1 FROM public.user_credits uc
--       WHERE uc.user_id = auth.uid() AND uc.tier = 'admin'
--     )
--   )
--
-- Because the policy is FOR ALL, the inner SELECT re-invokes the same
-- policy, triggering Postgres error:
--
--   42P17: infinite recursion detected in policy for relation "user_credits"
--
-- This breaks every authenticated SELECT / UPDATE / DELETE against
-- user_credits — including GET /api/user/credits, which client code
-- uses on every page load to hydrate the sidebar/header. Users see
-- 500 Internal Server Error.
--
-- Fix: move the admin check into a SECURITY DEFINER function that runs
-- as the table owner (bypassing RLS on the inner lookup). This is the
-- standard Postgres recipe for "policy needs to consult the same table"
-- — see https://supabase.com/docs/guides/database/postgres/row-level-security#recommended-helper-functions
-- ============================================================

-- 1. SECURITY DEFINER helper. Runs as the function owner (postgres),
--    bypassing RLS on the inner lookup, so the outer policy doesn't
--    recurse. STABLE so Postgres can cache per-statement.
CREATE OR REPLACE FUNCTION public.is_nexus_prime_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_credits
    WHERE user_id = auth.uid()
      AND tier = 'admin'
  );
$$;

-- Limit EXECUTE to authenticated roles only. Anon shouldn't be able to
-- probe admin status, and service_role bypasses RLS so doesn't need it.
REVOKE ALL ON FUNCTION public.is_nexus_prime_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_nexus_prime_admin() TO authenticated;

-- 2. Rewrite the admin policy to call the helper instead of embedding
--    a subquery against user_credits.
DROP POLICY IF EXISTS "Admins can manage all credits" ON public.user_credits;

CREATE POLICY "Admins can manage all credits" ON public.user_credits
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR public.is_nexus_prime_admin()
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
    OR public.is_nexus_prime_admin()
  );

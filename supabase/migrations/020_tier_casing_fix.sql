-- ============================================================
-- 020_tier_casing_fix.sql
--
-- Fixes a casing inconsistency in migration 017 that would cause
-- NEW superuser signups to fail with a CHECK constraint violation:
--
--   * 017's handle_new_user trigger INSERTs `tier = 'admin'`  (lowercase)
--   * 017's backfill UPDATE sets         `tier = 'Admin'`     (titlecase)
--   * 017's CHECK constraint allows       'Admin'             (titlecase only)
--   * 017's RLS policy matches            'Admin'             (titlecase only)
--   * All TypeScript code checks          'admin'             (lowercase)
--
-- The existing superuser was elevated via the Supabase Management API
-- earlier this session and that UPDATE used lowercase 'admin', so the
-- live row happens to be consistent with the TS code today. But any
-- NEW signup (e.g. adding another email to superuser_emails) would
-- fail the CHECK constraint, and the backfill path would leave the
-- tier as 'Admin' which TS code wouldn't match.
--
-- Resolution: standardize on lowercase 'admin' everywhere, which is
-- what the application code already expects.
-- ============================================================

-- 1. Expand the CHECK constraint to allow lowercase 'admin'.
--    Keep 'Admin' as well for safety in case any legacy rows survive.
ALTER TABLE public.user_credits
  DROP CONSTRAINT IF EXISTS user_credits_tier_check;

ALTER TABLE public.user_credits
  ADD CONSTRAINT user_credits_tier_check
  CHECK (tier IN ('free', 'Starter', 'PRO', 'Enterprise', 'Admin', 'admin'));

-- 2. Normalize any existing 'Admin' rows to lowercase so TS code matches.
UPDATE public.user_credits
SET    tier       = 'admin',
       updated_at = now()
WHERE  tier = 'Admin';

-- 3. Re-create handle_new_user so it uses lowercase 'admin' consistently.
--    Also make it tolerate pre-existing credit rows (the old version
--    would crash the signup if a row already existed for the user_id).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tier TEXT := 'Starter';
  v_balance INTEGER := 0;
  superuser_emails TEXT[] := ARRAY['eugenemcmillian9@gmail.com'];
BEGIN
  IF NEW.email = ANY(superuser_emails) THEN
    v_tier    := 'admin';
    v_balance := 999999;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, updated_at = now();

  INSERT INTO public.user_credits (user_id, balance, lifetime_credits, tier)
  VALUES (NEW.id, v_balance, v_balance, v_tier)
  ON CONFLICT (user_id) DO UPDATE
    SET tier    = EXCLUDED.tier,
        balance = GREATEST(public.user_credits.balance, EXCLUDED.balance),
        updated_at = now();

  INSERT INTO public.user_credit_ledger (user_id, amount, type, description, balance_after)
  VALUES (
    NEW.id,
    v_balance,
    'BONUS',
    CASE WHEN v_tier = 'admin' THEN 'Superuser bootstrap — unlimited access' ELSE 'Account created' END,
    v_balance
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Refresh the admin RLS policy so it matches on lowercase 'admin'.
DROP POLICY IF EXISTS "Admins can manage all credits" ON public.user_credits;
CREATE POLICY "Admins can manage all credits" ON public.user_credits
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.user_credits uc
      WHERE uc.user_id = auth.uid()
        AND uc.tier = 'admin'
    )
  );

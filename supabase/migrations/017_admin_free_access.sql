-- ============================================================
-- 017_admin_free_access.sql
-- Ensure superuser emails are auto-elevated to Admin tier on signup.
-- Admin users get unlimited credits and bypass all payment gates.
-- Run this in your Supabase SQL Editor or apply via CLI.
-- ============================================================

-- 1. Patch the handle_new_user trigger function.
--    For designated superuser emails: tier = 'Admin', balance = 999999
--    For everyone else:              tier = 'Starter', balance = 0
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tier TEXT := 'Starter';
  v_balance INTEGER := 0;
  superuser_emails TEXT[] := ARRAY['eugenemcmillian9@gmail.com'];
BEGIN
  -- Auto-elevate known superuser emails
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
        balance = GREATEST(user_credits.balance, EXCLUDED.balance),
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

-- Re-attach the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill any EXISTING superuser accounts that were created before this migration.
UPDATE public.user_credits
SET   tier       = 'Admin',
      balance    = 999999,
      updated_at = now()
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email = ANY(ARRAY['eugenemcmillian9@gmail.com'])
);

-- 3. Ensure the tier column allows 'Admin'
ALTER TABLE public.user_credits
  DROP CONSTRAINT IF EXISTS user_credits_tier_check;

ALTER TABLE public.user_credits
  ADD CONSTRAINT user_credits_tier_check
  CHECK (tier IN ('free', 'Starter', 'PRO', 'Enterprise', 'Admin'));

-- 4. Add a service-role policy so admin API routes can read/write all user_credits rows
DROP POLICY IF EXISTS "Admins can manage all credits" ON public.user_credits;
CREATE POLICY "Admins can manage all credits" ON public.user_credits
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR (
      EXISTS (
        SELECT 1 FROM public.user_credits uc
        WHERE uc.user_id = auth.uid()
          AND uc.tier = 'Admin'
      )
    )
  );

-- Done.
-- To apply: paste into Supabase SQL Editor and click "Run"
-- Or: supabase db push  (if using CLI with migrations)

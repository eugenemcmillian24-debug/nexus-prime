-- ============================================================
-- 024_admin_access_configuration.sql
--
-- Refactor handle_new_user to use a dynamic admin list from
-- a database setting 'app.admin_access' instead of hardcoded emails.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tier TEXT := 'Starter';
  v_balance INTEGER := 0;
  v_admin_access TEXT;
  v_admin_emails TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Fetch admin emails from custom setting (comma-separated string)
  v_admin_access := current_setting('app.admin_access', true);
  
  IF v_admin_access IS NOT NULL AND v_admin_access <> '' THEN
    -- Convert string to array and trim each entry
    SELECT array_agg(trim(e))
    INTO v_admin_emails
    FROM unnest(string_to_array(v_admin_access, ',')) e;
  END IF;

  -- Check if user is in the admin list
  IF NEW.email = ANY(v_admin_emails) THEN
    v_tier    := 'admin';
    v_balance := 999999;
  END IF;

  -- 1. Profiles Sync
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, updated_at = now();

  -- 2. Credits Sync
  INSERT INTO public.user_credits (user_id, balance, lifetime_credits, tier)
  VALUES (NEW.id, v_balance, v_balance, v_tier)
  ON CONFLICT (user_id) DO UPDATE
    SET tier    = EXCLUDED.tier,
        balance = GREATEST(public.user_credits.balance, EXCLUDED.balance),
        updated_at = now();

  -- 3. Ledger Entry
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

-- Backfill existing users if the setting is already present
DO $$
DECLARE
  v_admin_access TEXT;
  v_admin_emails TEXT[];
BEGIN
  v_admin_access := current_setting('app.admin_access', true);
  
  IF v_admin_access IS NOT NULL AND v_admin_access <> '' THEN
    -- Convert string to array and trim each entry
    SELECT array_agg(trim(e))
    INTO v_admin_emails
    FROM unnest(string_to_array(v_admin_access, ',')) e;
    
    -- Update existing users to admin status
    UPDATE public.user_credits
    SET tier = 'admin',
        balance = GREATEST(balance, 999999),
        updated_at = now()
    WHERE user_id IN (
      SELECT id FROM auth.users WHERE email = ANY(v_admin_emails)
    )
    AND tier <> 'admin';
  END IF;
END $$;

-- Migration 026: Refined Admin Access Trigger
-- This migration ensures that admin status is synced based on the app.admin_access setting.
-- It also cleans up any remaining hardcoded admin emails from previous migrations.

CREATE OR REPLACE FUNCTION public.handle_admin_access_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_access TEXT;
  v_admin_emails TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Fetch admin emails from custom setting (comma-separated string)
  BEGIN
    v_admin_access := current_setting('app.admin_access', true);
  EXCEPTION WHEN OTHERS THEN
    v_admin_access := '';
  END;
  
  IF v_admin_access IS NOT NULL AND v_admin_access <> '' THEN
    -- Convert string to array and trim each entry, using lower() for case-insensitive comparison
    SELECT array_agg(trim(lower(e)))
    INTO v_admin_emails
    FROM unnest(string_to_array(v_admin_access, ',')) e;

    -- Check if user is in the admin list
    IF lower(NEW.email) = ANY(v_admin_emails) THEN
      UPDATE public.user_credits
      SET tier = 'admin',
          balance = GREATEST(balance, 999999),
          updated_at = now()
      WHERE user_id = NEW.id
      AND tier <> 'admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is attached to auth.users
DROP TRIGGER IF EXISTS on_auth_user_admin_sync ON auth.users;
CREATE TRIGGER on_auth_user_admin_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_access_sync();

-- Also update handle_new_user to be consistent
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tier TEXT := 'Starter';
  v_balance INTEGER := 0;
  v_admin_access TEXT;
  v_admin_emails TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Fetch admin emails from custom setting
  BEGIN
    v_admin_access := current_setting('app.admin_access', true);
  EXCEPTION WHEN OTHERS THEN
    v_admin_access := '';
  END;
  
  IF v_admin_access IS NOT NULL AND v_admin_access <> '' THEN
    SELECT array_agg(trim(lower(e)))
    INTO v_admin_emails
    FROM unnest(string_to_array(v_admin_access, ',')) e;
    
    IF lower(NEW.email) = ANY(v_admin_emails) THEN
      v_tier    := 'admin';
      v_balance := 999999;
    END IF;
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

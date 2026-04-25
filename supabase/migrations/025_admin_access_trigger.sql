-- Migration 025: Admin Access Sync Trigger
-- Automatically syncs admin status from app.admin_access setting to user_credits table
-- when a user's email is updated or a new user is created.

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
    -- Convert string to array and trim each entry
    SELECT array_agg(trim(lower(e)))
    INTO v_admin_emails
    FROM unnest(string_to_array(v_admin_access, ',')) e;

    -- Check if user is in the admin list
    IF lower(NEW.email) = ANY(v_admin_emails) THEN
      UPDATE public.user_credits
      SET tier = 'admin',
          updated_at = now()
      WHERE user_id = NEW.id
      AND tier <> 'admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users for both insert and update of email
DROP TRIGGER IF EXISTS on_auth_user_admin_sync ON auth.users;
CREATE TRIGGER on_auth_user_admin_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_access_sync();

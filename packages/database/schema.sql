-- PROFILES: Store additional user data (linked to Auth.Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  full_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure user_credits exists and references auth.users correctly
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 100,
  tier TEXT DEFAULT 'Starter',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to create a profile and user_credits record automatically on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');

  INSERT INTO public.user_credits (user_id, balance, tier)
  VALUES (NEW.id, 100, 'Starter');

  RETURN NEW;
END;
$$ language plpgsql security definer;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ... (Rest of the previous tables: agent_jobs, agent_events, user_credit_ledger)

-- Credit Ledger View: Unified timeline of all credit changes
-- Combines purchases (+) and agent jobs (-) into one stream.
CREATE OR REPLACE VIEW user_credit_ledger AS
  SELECT 
    user_id,
    'PURCHASE' as type,
    credits_added as amount,
    status as description,
    created_at
  FROM credit_purchases
  WHERE status = 'succeeded'
  UNION ALL
  SELECT 
    user_id,
    'USAGE' as type,
    -credits_cost as amount,
    agent_type || ': ' || LEFT(prompt, 30) || '...' as description,
    created_at
  FROM agent_jobs
  WHERE status IN ('completed', 'in_progress')
  ORDER BY created_at DESC;

-- NEXUS GUARD: Atomic Credit Deduction Function
-- Prevents race conditions and 'Double-Spend' bugs using SELECT FOR UPDATE.
CREATE OR REPLACE FUNCTION deduct_user_credits(target_user_id UUID, amount_to_deduct INTEGER)
RETURNS JSONB AS $$
DECLARE
  current_balance INTEGER;
  result JSONB;
BEGIN
  -- 1. Lock the row to prevent concurrent modifications
  SELECT balance INTO current_balance
  FROM user_credits
  WHERE user_id = target_user_id
  FOR UPDATE;

  -- 2. Validate sufficient funds
  IF current_balance IS NULL OR current_balance < amount_to_deduct THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits. Sequence aborted.');
  END IF;

  -- 3. Perform atomic deduction
  UPDATE user_credits
  SET balance = balance - amount_to_deduct,
      updated_at = now()
  WHERE user_id = target_user_id;

  RETURN jsonb_build_object('success', true, 'new_balance', current_balance - amount_to_deduct);
END;
$$ language 'plpgsql';

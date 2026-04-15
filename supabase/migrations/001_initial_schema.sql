-- ============================================================
-- NEXUS PRIME — Full Supabase Schema Migration
-- Tables: profiles, user_credits, credit_purchases, user_credit_ledger, subscriptions
-- Triggers: auto-create profile + credits on signup, auto-add credits on purchase
-- RLS: users can only read/update their own data
-- ============================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. USER CREDITS TABLE
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  lifetime_credits INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'Starter', 'PRO', 'Enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
CREATE POLICY "Users can view own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;
CREATE POLICY "Users can update own credits" ON public.user_credits
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. CREDIT PURCHASES TABLE (logged by webhook)
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_usd NUMERIC(10,2) NOT NULL,
  credits_added INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own purchases" ON public.credit_purchases;
CREATE POLICY "Users can view own purchases" ON public.credit_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- 4. CREDIT LEDGER TABLE (full audit trail)
CREATE TABLE IF NOT EXISTS public.user_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PURCHASE', 'USAGE', 'REFUND', 'BONUS', 'SUBSCRIPTION')),
  description TEXT,
  reference_id TEXT,
  balance_after INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ledger" ON public.user_credit_ledger;
CREATE POLICY "Users can view own ledger" ON public.user_credit_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- 5. SUBSCRIPTIONS TABLE (track active Stripe subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('Starter', 'PRO', 'Enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- A. Auto-create profile + credits row on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );

  INSERT INTO public.user_credits (user_id, balance, lifetime_credits, tier)
  VALUES (NEW.id, 3, 3, 'free');

  INSERT INTO public.user_credit_ledger (user_id, amount, type, description, balance_after)
  VALUES (NEW.id, 3, 'BONUS', 'Welcome bonus — 3 free credits', 3);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. Auto-add credits when a purchase succeeds
CREATE OR REPLACE FUNCTION public.on_credit_purchase_success()
RETURNS TRIGGER AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  IF NEW.status = 'succeeded' AND (OLD IS NULL OR OLD.status != 'succeeded') THEN
    UPDATE public.user_credits
    SET balance = balance + NEW.credits_added,
        lifetime_credits = lifetime_credits + NEW.credits_added,
        updated_at = now()
    WHERE user_id = NEW.user_id
    RETURNING balance INTO current_balance;

    INSERT INTO public.user_credit_ledger (user_id, amount, type, description, reference_id, balance_after)
    VALUES (
      NEW.user_id,
      NEW.credits_added,
      'PURCHASE',
      'Credit purchase — ' || NEW.credits_added || ' credits',
      NEW.stripe_payment_intent_id,
      current_balance
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_credit_purchase ON public.credit_purchases;
CREATE TRIGGER on_credit_purchase
  AFTER INSERT OR UPDATE ON public.credit_purchases
  FOR EACH ROW EXECUTE FUNCTION public.on_credit_purchase_success();

-- C. Auto-deduct credits on usage (called from API)
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id UUID, p_amount INTEGER, p_description TEXT DEFAULT 'AI generation')
RETURNS TABLE(success BOOLEAN, remaining_balance INTEGER) AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  SELECT balance INTO current_balance FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;

  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN QUERY SELECT false, COALESCE(current_balance, 0);
    RETURN;
  END IF;

  UPDATE public.user_credits
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.user_credit_ledger (user_id, amount, type, description, balance_after)
  VALUES (p_user_id, -p_amount, 'USAGE', p_description, current_balance - p_amount);

  RETURN QUERY SELECT true, current_balance - p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON public.credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credit_ledger_user_id ON public.user_credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON public.subscriptions(stripe_subscription_id);

-- ============================================================
-- ENABLE REALTIME for user_credits (for live balance updates)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_credits;

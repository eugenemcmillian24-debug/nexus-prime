-- NEXUS PRIME: ADVANCED MONETIZATION SCHEMA
-- This migration adds support for Subscription Tiers, Credit Top-ups, and Feature Add-ons.

-- 1. USER CREDITS ENHANCEMENT
CREATE TABLE IF NOT EXISTS public.user_credits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0,
    lifetime_credits INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'Free', -- 'Free', 'Starter', 'PRO', 'Enterprise', 'Admin'
    subscription_id TEXT,
    stripe_customer_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. SUBSCRIPTION TRACKING
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY, -- Stripe Subscription ID
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT, -- 'active', 'canceled', 'incomplete', etc.
    price_id TEXT,
    quantity INTEGER,
    cancel_at_period_end BOOLEAN,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TOP-UP TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'purchase', 'subscription_grant', 'usage', 'refund', 'admin_adjustment'
    description TEXT,
    stripe_session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. ATOMIC CREDIT FUNCTIONS
CREATE OR REPLACE FUNCTION public.add_user_credits(
    target_user_id UUID, 
    amount_to_add INTEGER, 
    transaction_type TEXT, 
    transaction_desc TEXT,
    session_id TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance INTEGER;
BEGIN
    -- 1. Update Balance
    UPDATE public.user_credits
    SET balance = balance + amount_to_add,
        lifetime_credits = CASE WHEN amount_to_add > 0 THEN lifetime_credits + amount_to_add ELSE lifetime_credits END,
        updated_at = now()
    WHERE user_id = target_user_id
    RETURNING balance INTO new_balance;

    -- 2. Log Transaction
    INSERT INTO public.credit_transactions (user_id, amount, type, description, stripe_session_id)
    VALUES (target_user_id, amount_to_add, transaction_type, transaction_desc, session_id);

    RETURN jsonb_build_object(
        'success', true, 
        'new_balance', new_balance
    );
END;
$$;

-- 5. RLS POLICIES
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON public.user_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- 6. TRIGGER: Auto-create credits on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_credits (user_id, balance, lifetime_credits, tier)
    VALUES (NEW.id, 10, 10, 'Free'); -- 10 Free credits for new users
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();

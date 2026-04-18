-- 012_infrastructure_marketplace.sql
-- Infrastructure Upselling & Blueprint Marketplace

-- 1. Project Infrastructure Updates (Protocol Fee)
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS protocol_fee_paid BOOLEAN DEFAULT false;

-- 2. Blueprint Marketplace Updates
ALTER TABLE public.agent_training_modules ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0; -- Price in credits
ALTER TABLE public.agent_training_modules ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0; -- Total times used/purchased

-- Update notifications type constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('deploy', 'review', 'team', 'system', 'mention', 'version', 'marketplace'));

-- 3. Marketplace Transactions Table
CREATE TABLE IF NOT EXISTS public.marketplace_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES auth.users(id),
    buyer_id UUID NOT NULL REFERENCES auth.users(id),
    module_id UUID NOT NULL REFERENCES public.agent_training_modules(id),
    amount INTEGER NOT NULL,
    platform_fee INTEGER NOT NULL, -- 20% commission
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies for Transactions
ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sales"
    ON public.marketplace_transactions
    FOR SELECT
    USING (auth.uid() = seller_id);

CREATE POLICY "Users can view their own purchases"
    ON public.marketplace_transactions
    FOR SELECT
    USING (auth.uid() = buyer_id);

-- 4. Marketplace Purchases Table (to track access)
CREATE TABLE IF NOT EXISTS public.marketplace_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    module_id UUID NOT NULL REFERENCES public.agent_training_modules(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, module_id)
);

ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases access"
    ON public.marketplace_purchases
    FOR SELECT
    USING (auth.uid() = user_id);

-- 5. RPC for Marketplace Purchase (Atomic Transaction)
CREATE OR REPLACE FUNCTION purchase_blueprint(
    p_buyer_id UUID,
    p_module_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_price INTEGER;
    v_platform_fee INTEGER;
    v_seller_amount INTEGER;
    v_buyer_balance INTEGER;
BEGIN
    -- 1. Get module details
    SELECT user_id, price INTO v_seller_id, v_price
    FROM public.agent_training_modules
    WHERE id = p_module_id;

    IF v_seller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Module not found');
    END IF;

    IF v_seller_id = p_buyer_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'You already own this module');
    END IF;

    -- 2. Check buyer balance
    SELECT balance INTO v_buyer_balance
    FROM public.user_credits
    WHERE user_id = p_buyer_id;

    IF v_buyer_balance < v_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
    END IF;

    -- 3. Check if already purchased
    IF EXISTS (SELECT 1 FROM public.marketplace_purchases WHERE user_id = p_buyer_id AND module_id = p_module_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already purchased');
    END IF;

    -- 4. Execute transaction
    v_platform_fee := floor(v_price * 0.2);
    v_seller_amount := v_price - v_platform_fee;

    -- Deduct from buyer
    UPDATE public.user_credits 
    SET balance = balance - v_price 
    WHERE user_id = p_buyer_id;

    -- Add to seller
    UPDATE public.user_credits 
    SET balance = balance + v_seller_amount 
    WHERE user_id = v_seller_id;

    -- Increment usage count
    UPDATE public.agent_training_modules
    SET usage_count = usage_count + 1
    WHERE id = p_module_id;

    -- Log transaction
    INSERT INTO public.marketplace_transactions (seller_id, buyer_id, module_id, amount, platform_fee)
    VALUES (v_seller_id, p_buyer_id, p_module_id, v_price, v_platform_fee);

    -- Grant access
    INSERT INTO public.marketplace_purchases (user_id, module_id)
    VALUES (p_buyer_id, p_module_id);

    -- Trigger internal notification for seller
    PERFORM public.send_notification(
        v_seller_id,
        'marketplace',
        'Blueprint Sold!',
        'Your blueprint has been purchased for ' || v_price || ' credits.',
        jsonb_build_object('module_id', p_module_id, 'amount', v_price, 'buyer_id', p_buyer_id)
    );

    RETURN jsonb_build_object('success', true, 'new_balance', v_buyer_balance - v_price);
END;
$$;

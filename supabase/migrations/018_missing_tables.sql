-- Migration: Add missing tables referenced in code
-- template_likes: used by marketplace like toggle
-- blueprint_transactions: used by agent training marketplace

-- 1. template_likes
CREATE TABLE IF NOT EXISTS public.template_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, user_id)
);

ALTER TABLE public.template_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes" ON public.template_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own likes" ON public.template_likes
  FOR ALL USING (auth.uid() = user_id);

-- 2. blueprint_transactions
CREATE TABLE IF NOT EXISTS public.blueprint_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.agent_training_modules(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 0,
  transaction_type TEXT NOT NULL DEFAULT 'purchase',
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.blueprint_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.blueprint_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions" ON public.blueprint_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- NEXUS PRIME — Migration 009: Agent Infrastructure
-- Tables: agent_jobs, agent_events
-- RPC: deduct_user_credits
-- ============================================================

-- 1. AGENT JOBS TABLE
CREATE TABLE IF NOT EXISTS public.agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  agent_type TEXT,
  prompt TEXT,
  image_url TEXT,
  credits_cost INTEGER DEFAULT 1,
  result JSONB,
  error TEXT,
  version INTEGER DEFAULT 1,
  parent_job_id UUID REFERENCES public.agent_jobs(id),
  thread_id UUID REFERENCES public.build_threads(id),
  project_id UUID REFERENCES public.projects(id),
  title TEXT,
  is_starred BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own jobs" ON public.agent_jobs;
CREATE POLICY "Users can manage own jobs" ON public.agent_jobs
  FOR ALL USING (auth.uid() = user_id);

-- 2. AGENT EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.agent_jobs(id) ON DELETE CASCADE,
  agent_name TEXT,
  event_type TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view events for own jobs" ON public.agent_events;
CREATE POLICY "Users can view events for own jobs" ON public.agent_events
  FOR SELECT USING (
    job_id IN (SELECT id FROM public.agent_jobs WHERE user_id = auth.uid())
  );

-- 3. RPC FUNCTION: deduct_user_credits
CREATE OR REPLACE FUNCTION public.deduct_user_credits(target_user_id UUID, amount_to_deduct INTEGER)
RETURNS JSONB AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Check current balance
  SELECT balance INTO current_balance FROM public.user_credits WHERE user_id = target_user_id FOR UPDATE;
  
  IF current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User credits not found');
  END IF;

  IF amount_to_deduct > 0 AND current_balance < amount_to_deduct THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits', 'current_balance', current_balance);
  END IF;

  -- Deduct (or refund if negative)
  UPDATE public.user_credits
  SET balance = balance - amount_to_deduct,
      updated_at = now()
  WHERE user_id = target_user_id
  RETURNING balance INTO new_balance;

  -- Log in ledger
  INSERT INTO public.user_credit_ledger (user_id, amount, type, description, balance_after)
  VALUES (
    target_user_id, 
    -amount_to_deduct, 
    CASE WHEN amount_to_deduct > 0 THEN 'USAGE' ELSE 'REFUND' END,
    CASE WHEN amount_to_deduct > 0 THEN 'AI Agent Usage' ELSE 'AI Agent Refund' END,
    new_balance
  );

  RETURN jsonb_build_object('success', true, 'new_balance', new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ENABLE REALTIME
-- Wrap in DO block to avoid error if already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'agent_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'agent_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_jobs;
  END IF;
END $$;

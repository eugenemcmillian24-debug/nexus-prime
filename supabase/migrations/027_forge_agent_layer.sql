-- ============================================================
-- 027_forge_agent_layer.sql
--
-- Adds support for granular state machine, job durability,
-- and GitHub/Vercel automation configurations.
-- ============================================================

-- 1. ENHANCE AGENT_JOBS
ALTER TABLE public.agent_jobs
  ADD COLUMN IF NOT EXISTS current_step TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS step_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS retry_count_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS automation_config_id UUID;

-- 2. AUTOMATION CONFIGS TABLE
CREATE TABLE IF NOT EXISTS public.agent_automation_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  github_repo_full_name TEXT, -- e.g. "user/repo"
  vercel_project_id TEXT,
  vercel_team_id TEXT,
  enabled BOOLEAN DEFAULT true,
  auto_pr BOOLEAN DEFAULT false,
  auto_deploy BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_automation_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own automation configs" ON public.agent_automation_configs;
CREATE POLICY "Users can manage own automation configs" ON public.agent_automation_configs
  FOR ALL USING (auth.uid() = user_id);

-- 3. LINK AGENT_JOBS TO AUTOMATION_CONFIGS
-- Using a separate block to ensure we don't fail if column already has a constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'agent_jobs' AND constraint_name = 'fk_automation_config'
  ) THEN
    ALTER TABLE public.agent_jobs
      ADD CONSTRAINT fk_automation_config
      FOREIGN KEY (automation_config_id)
      REFERENCES public.agent_automation_configs(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4. ADD VERIFICATION RESULTS
ALTER TABLE public.agent_jobs
  ADD COLUMN IF NOT EXISTS verification_results JSONB DEFAULT '{}'::jsonb;

-- 5. ENABLE REALTIME
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'agent_automation_configs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_automation_configs;
  END IF;
END $$;

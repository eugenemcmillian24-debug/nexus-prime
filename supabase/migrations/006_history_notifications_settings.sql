-- Migration 006: Prompt History + Notifications + Project Settings
-- For nexus-prime (Multi-Agent AI Application Builder)

-- ============================================================
-- 1. PROMPT HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prompt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  prompt TEXT NOT NULL,
  response TEXT,
  model TEXT NOT NULL DEFAULT 'groq',
  template_id UUID REFERENCES public.prompt_templates(id) ON DELETE SET NULL,
  template_name TEXT,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  tokens_total INTEGER DEFAULT 0,
  cost DECIMAL(10, 6) DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  rating TEXT CHECK (rating IN ('good', 'bad')),
  tags TEXT[] DEFAULT '{}',
  starred BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_prompt_history_project ON public.prompt_history(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_history_user ON public.prompt_history(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_history_starred ON public.prompt_history(user_id, starred) WHERE starred = true;
CREATE INDEX IF NOT EXISTS idx_prompt_history_model ON public.prompt_history(model);

CREATE POLICY "Users can view own prompt history"
  ON public.prompt_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create prompt history"
  ON public.prompt_history FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own prompt history"
  ON public.prompt_history FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own prompt history"
  ON public.prompt_history FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 2. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('deploy', 'review', 'team', 'system', 'mention', 'version')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  action_label TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT WITH CHECK (true);

-- ============================================================
-- 3. PROJECT SETTINGS (extend projects table)
-- ============================================================
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS default_model TEXT DEFAULT 'groq';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS auto_save BOOLEAN DEFAULT true;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS auto_format BOOLEAN DEFAULT true;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tab_size INTEGER DEFAULT 2;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS lint_on_save BOOLEAN DEFAULT true;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deploy_target TEXT DEFAULT 'vercel';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS env_vars JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS webhook_events TEXT[] DEFAULT '{}';

-- Create unique index on slug (where not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug) WHERE slug IS NOT NULL;

-- ============================================================
-- 4. HELPER: Send notification to user
-- ============================================================
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, metadata, action_url, action_label)
  VALUES (p_user_id, p_type, p_title, p_message, p_metadata, p_action_url, p_action_label)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. HELPER: Get prompt usage stats
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_prompt_stats(
  p_user_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
) RETURNS TABLE(
  total_prompts BIGINT,
  total_tokens BIGINT,
  total_cost DECIMAL,
  avg_duration DECIMAL,
  model_breakdown JSONB,
  daily_usage JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT * FROM public.prompt_history ph
    WHERE ph.user_id = p_user_id
      AND (p_project_id IS NULL OR ph.project_id = p_project_id)
      AND ph.created_at >= now() - (p_days || ' days')::INTERVAL
  ),
  by_model AS (
    SELECT ph.model, COUNT(*) as cnt, SUM(ph.tokens_total) as tok
    FROM base ph GROUP BY ph.model
  ),
  by_day AS (
    SELECT DATE(ph.created_at) as day, COUNT(*) as cnt
    FROM base ph GROUP BY DATE(ph.created_at)
  )
  SELECT
    (SELECT COUNT(*) FROM base)::BIGINT,
    (SELECT COALESCE(SUM(b.tokens_total), 0) FROM base b)::BIGINT,
    (SELECT COALESCE(SUM(b.cost), 0) FROM base b)::DECIMAL,
    (SELECT COALESCE(AVG(b.duration_ms), 0) FROM base b)::DECIMAL,
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('model', bm.model, 'count', bm.cnt, 'tokens', bm.tok)), '[]'::jsonb) FROM by_model bm),
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('date', bd.day, 'count', bd.cnt) ORDER BY bd.day), '[]'::jsonb) FROM by_day bd);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

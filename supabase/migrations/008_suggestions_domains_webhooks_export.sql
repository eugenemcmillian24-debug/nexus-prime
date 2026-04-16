-- Migration 008: Context Suggestions + Custom Domains + Webhooks + API Tokens + GitHub Export

-- ============================================================
-- 1. AI SUGGESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('component', 'route', 'style', 'fix', 'refactor', 'feature', 'test')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  code TEXT,
  file_path TEXT,
  line_number INTEGER,
  confidence DECIMAL(3,2) DEFAULT 0.5,
  impact TEXT DEFAULT 'medium' CHECK (impact IN ('low', 'medium', 'high')),
  applied BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_suggestions_project ON public.ai_suggestions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_active ON public.ai_suggestions(project_id, applied, dismissed);

CREATE POLICY "Project owners can manage suggestions"
  ON public.ai_suggestions FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- ============================================================
-- 2. CUSTOM DOMAINS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'active', 'error', 'expired')),
  ssl_status TEXT DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'provisioning', 'active', 'error')),
  dns_records JSONB DEFAULT '[]'::jsonb,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_domains_project ON public.custom_domains(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_domains_domain ON public.custom_domains(domain);

CREATE POLICY "Project owners can manage domains"
  ON public.custom_domains FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- ============================================================
-- 3. WEBHOOKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  last_status INTEGER,
  delivery_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_webhooks_project ON public.webhooks(project_id);

CREATE POLICY "Project owners can manage webhooks"
  ON public.webhooks FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- ============================================================
-- 4. WEBHOOK DELIVERIES (audit log)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INTEGER,
  response_body TEXT,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON public.webhook_deliveries(webhook_id, created_at DESC);

CREATE POLICY "Webhook owners can view deliveries"
  ON public.webhook_deliveries FOR SELECT USING (
    webhook_id IN (SELECT id FROM public.webhooks WHERE project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
  );

-- ============================================================
-- 5. API TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  token_preview TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  request_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tokens_project ON public.api_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_tokens_hash ON public.api_tokens(token_hash);

CREATE POLICY "Users can manage own tokens"
  ON public.api_tokens FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 6. GITHUB EXPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.github_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  repo_name TEXT NOT NULL,
  repo_url TEXT,
  repo_visibility TEXT DEFAULT 'private',
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'exporting', 'completed', 'failed')),
  files_exported INTEGER DEFAULT 0,
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.github_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own exports"
  ON public.github_exports FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 7. HELPER: Record webhook delivery
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_webhook_delivery(
  p_webhook_id UUID, p_event TEXT, p_payload JSONB,
  p_status INTEGER, p_body TEXT, p_duration INTEGER, p_success BOOLEAN
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.webhook_deliveries (webhook_id, event, payload, response_status, response_body, duration_ms, success)
  VALUES (p_webhook_id, p_event, p_payload, p_status, p_body, p_duration, p_success);

  UPDATE public.webhooks SET
    delivery_count = delivery_count + 1,
    failure_count = CASE WHEN p_success THEN failure_count ELSE failure_count + 1 END,
    last_triggered_at = now(),
    last_status = p_status
  WHERE id = p_webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. HELPER: Increment API token usage
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_token_usage(p_token_hash TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.api_tokens SET request_count = request_count + 1, last_used_at = now()
  WHERE token_hash = p_token_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

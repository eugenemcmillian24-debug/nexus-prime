-- Migration 007: API Key Management + Template Marketplace + Collab Presence
-- For nexus-prime (Multi-Agent AI Application Builder)

-- ============================================================
-- 1. API KEY VAULT (encrypted storage)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('groq', 'gemini', 'openrouter', 'openai', 'anthropic', 'vercel', 'stripe', 'custom')),
  label TEXT NOT NULL,
  key_encrypted TEXT NOT NULL,  -- encrypted at app layer
  key_preview TEXT NOT NULL,    -- e.g., "sk-...abc123"
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  rate_limits JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON public.api_keys(user_id, provider);

CREATE POLICY "Users can manage own keys"
  ON public.api_keys FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 2. TEMPLATE MARKETPLACE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketplace_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'coding' CHECK (category IN ('coding', 'writing', 'design', 'analysis', 'devops', 'testing', 'docs')),
  tags TEXT[] DEFAULT '{}',
  prompt TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  downloads INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.marketplace_templates ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON public.marketplace_templates(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_downloads ON public.marketplace_templates(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_rating ON public.marketplace_templates(rating DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_featured ON public.marketplace_templates(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_tags ON public.marketplace_templates USING gin(tags);

CREATE POLICY "Anyone can view published templates"
  ON public.marketplace_templates FOR SELECT USING (is_published = true);
CREATE POLICY "Authors can manage own templates"
  ON public.marketplace_templates FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can update own templates"
  ON public.marketplace_templates FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "Authors can delete own templates"
  ON public.marketplace_templates FOR DELETE USING (author_id = auth.uid());

-- ============================================================
-- 3. MARKETPLACE LIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketplace_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, user_id)
);

ALTER TABLE public.marketplace_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own likes"
  ON public.marketplace_likes FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 4. MARKETPLACE REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, user_id)
);

ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON public.marketplace_reviews FOR SELECT USING (true);
CREATE POLICY "Users can manage own reviews"
  ON public.marketplace_reviews FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reviews"
  ON public.marketplace_reviews FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- 5. TEMPLATE IMPORTS (track which templates users imported)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.template_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imported_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.template_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own imports"
  ON public.template_imports FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 6. COLLAB SESSIONS (for presence tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.collab_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'idle', 'offline')),
  active_file TEXT,
  cursor_position JSONB,
  color TEXT,
  last_heartbeat TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.collab_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_collab_project ON public.collab_sessions(project_id);

CREATE POLICY "Project members can view sessions"
  ON public.collab_sessions FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid() OR is_public = true)
    OR project_id IN (SELECT p.id FROM public.projects p JOIN public.team_members tm ON p.team_id = tm.team_id WHERE tm.user_id = auth.uid())
  );
CREATE POLICY "Users can manage own sessions"
  ON public.collab_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sessions"
  ON public.collab_sessions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own sessions"
  ON public.collab_sessions FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 7. COLLAB CHAT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.collab_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  type TEXT DEFAULT 'message' CHECK (type IN ('message', 'system', 'code')),
  file_ref TEXT,
  line_ref INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.collab_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_collab_messages_project ON public.collab_messages(project_id, created_at DESC);

CREATE POLICY "Project members can view messages"
  ON public.collab_messages FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid() OR is_public = true)
  );
CREATE POLICY "Users can send messages"
  ON public.collab_messages FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 8. HELPER: Toggle marketplace like
-- ============================================================
CREATE OR REPLACE FUNCTION public.toggle_marketplace_like(p_template_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.marketplace_likes
    WHERE template_id = p_template_id AND user_id = auth.uid()
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.marketplace_likes
    WHERE template_id = p_template_id AND user_id = auth.uid();
    UPDATE public.marketplace_templates SET likes = likes - 1 WHERE id = p_template_id;
    RETURN false;
  ELSE
    INSERT INTO public.marketplace_likes (template_id, user_id) VALUES (p_template_id, auth.uid());
    UPDATE public.marketplace_templates SET likes = likes + 1 WHERE id = p_template_id;
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. HELPER: Import marketplace template
-- ============================================================
CREATE OR REPLACE FUNCTION public.import_marketplace_template(p_template_id UUID)
RETURNS UUID AS $$
DECLARE
  v_template RECORD;
  v_import_id UUID;
BEGIN
  SELECT * INTO v_template FROM public.marketplace_templates WHERE id = p_template_id;
  IF v_template IS NULL THEN RAISE EXCEPTION 'Template not found'; END IF;

  -- Record the import
  INSERT INTO public.template_imports (marketplace_template_id, user_id)
  VALUES (p_template_id, auth.uid())
  RETURNING id INTO v_import_id;

  -- Increment download count
  UPDATE public.marketplace_templates SET downloads = downloads + 1 WHERE id = p_template_id;

  -- Copy to user's prompt_templates
  INSERT INTO public.prompt_templates (name, description, category, template, variables, is_system, user_id)
  VALUES (
    v_template.name,
    v_template.description,
    v_template.category,
    v_template.prompt,
    v_template.variables,
    false,
    auth.uid()
  );

  RETURN v_import_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. HELPER: Increment API key usage
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_api_key_usage(p_key_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.api_keys
  SET usage_count = usage_count + 1, last_used_at = now(), updated_at = now()
  WHERE id = p_key_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

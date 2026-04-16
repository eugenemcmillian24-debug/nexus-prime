-- ============================================================
-- NEXUS PRIME — Migration 003: New Features
-- Prompt Templates, Analytics, Component Library Enhancements
-- ============================================================

-- ============================================================
-- FEATURE: Prompt Templates & Favorites
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  category TEXT DEFAULT 'custom' CHECK (category IN ('landing', 'dashboard', 'ecommerce', 'portfolio', 'saas', 'mobile', 'game', 'custom')),
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own templates" ON public.prompt_templates
  FOR ALL USING (auth.uid() = user_id OR is_system = true);
CREATE POLICY "Anyone can view public templates" ON public.prompt_templates
  FOR SELECT USING (is_public = true OR is_system = true);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_user ON public.prompt_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON public.prompt_templates(category);

-- System starter templates
INSERT INTO public.prompt_templates (title, description, prompt, category, is_system, is_public) VALUES
('SaaS Landing Page', 'Modern SaaS landing page with hero, features, pricing, and CTA sections', 'Build a modern SaaS landing page with a hero section, feature grid, pricing table with 3 tiers, testimonials, and a CTA footer. Use dark theme with green accents.', 'landing', true, true),
('E-Commerce Store', 'Product listing with cart, filters, and checkout flow', 'Create an e-commerce storefront with product grid, category filters, search bar, shopping cart sidebar, and a clean checkout form. Include product detail modals.', 'ecommerce', true, true),
('Admin Dashboard', 'Analytics dashboard with charts, tables, and sidebar navigation', 'Build an admin dashboard with sidebar navigation, KPI cards at the top, a line chart for revenue, a bar chart for users, a recent orders table, and a dark theme.', 'dashboard', true, true),
('Portfolio Site', 'Developer portfolio with projects, about, and contact sections', 'Create a developer portfolio with an animated hero, project showcase grid with hover effects, about section with skills, and a contact form. Minimal dark design.', 'portfolio', true, true),
('AI Chat Interface', 'ChatGPT-style chat UI with message history and streaming', 'Build a chat interface like ChatGPT with a message list, user/AI message bubbles, a text input with send button, typing indicator, and sidebar for conversation history.', 'saas', true, true),
('Task Manager', 'Kanban board with drag-and-drop columns', 'Create a Kanban task manager with columns for Todo, In Progress, and Done. Include drag-and-drop cards, add task form, priority labels, and due dates. Dark theme.', 'dashboard', true, true);

-- ============================================================
-- FEATURE: User Analytics / Usage Tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('generation', 'refinement', 'deployment', 'export', 'gallery_publish', 'voice_input', 'screenshot_upload')),
  metadata JSONB DEFAULT '{}',
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own events" ON public.usage_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_usage_events_user ON public.usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_type ON public.usage_events(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_events_created ON public.usage_events(created_at DESC);

-- ============================================================
-- FEATURE: Model Selection Preferences
-- ============================================================
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS preferred_coder_model TEXT DEFAULT 'llama-3.1-8b-instant';
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS preferred_reasoner_model TEXT DEFAULT 'qwen/qwen3-32b';
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark';

-- ============================================================
-- FEATURE: Component Library Enhancements
-- ============================================================
ALTER TABLE IF EXISTS public.saved_components ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'ui' CHECK (category IN ('ui', 'layout', 'form', 'data', 'navigation', 'animation', 'other'));
ALTER TABLE IF EXISTS public.saved_components ADD COLUMN IF NOT EXISTS preview_url TEXT;
ALTER TABLE IF EXISTS public.saved_components ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.component_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.saved_components(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, component_id)
);

ALTER TABLE public.component_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own likes" ON public.component_likes
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTION: Get user analytics summary
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_analytics(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_generations', COALESCE((SELECT COUNT(*) FROM public.usage_events WHERE user_id = p_user_id AND event_type = 'generation' AND created_at > now() - (p_days || ' days')::interval), 0),
    'total_refinements', COALESCE((SELECT COUNT(*) FROM public.usage_events WHERE user_id = p_user_id AND event_type = 'refinement' AND created_at > now() - (p_days || ' days')::interval), 0),
    'total_deployments', COALESCE((SELECT COUNT(*) FROM public.usage_events WHERE user_id = p_user_id AND event_type = 'deployment' AND created_at > now() - (p_days || ' days')::interval), 0),
    'total_credits_used', COALESCE((SELECT SUM(credits_used) FROM public.usage_events WHERE user_id = p_user_id AND created_at > now() - (p_days || ' days')::interval), 0),
    'daily_activity', (
      SELECT COALESCE(jsonb_agg(day_data ORDER BY day), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', created_at)::date as day, COUNT(*) as count, SUM(credits_used) as credits
        FROM public.usage_events
        WHERE user_id = p_user_id AND created_at > now() - (p_days || ' days')::interval
        GROUP BY date_trunc('day', created_at)::date
      ) day_data
    ),
    'model_usage', (
      SELECT COALESCE(jsonb_agg(model_data), '[]'::jsonb)
      FROM (
        SELECT metadata->>'model' as model, COUNT(*) as count
        FROM public.usage_events
        WHERE user_id = p_user_id AND event_type = 'generation' AND created_at > now() - (p_days || ' days')::interval
        GROUP BY metadata->>'model'
      ) model_data
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

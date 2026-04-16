-- Migration 005: AI Code Review + Deployment Pipeline + Team Workspaces
-- For nexus-prime (Multi-Agent AI Application Builder)

-- ============================================================
-- 1. CODE REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.code_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.project_files(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  model_used TEXT NOT NULL DEFAULT 'groq',
  review_type TEXT NOT NULL DEFAULT 'general' CHECK (review_type IN ('general', 'security', 'performance', 'accessibility', 'best-practices')),
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.code_reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_code_reviews_project ON public.code_reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_code_reviews_file ON public.code_reviews(file_id);

CREATE POLICY "Users can view own project reviews"
  ON public.code_reviews FOR SELECT
  USING (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid() OR is_public = true
  ));

CREATE POLICY "Users can create reviews for own projects"
  ON public.code_reviews FOR INSERT
  WITH CHECK (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  ) AND requested_by = auth.uid());

CREATE POLICY "Users can update own reviews"
  ON public.code_reviews FOR UPDATE
  USING (requested_by = auth.uid());

-- ============================================================
-- 2. DEPLOYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number INTEGER,
  platform TEXT NOT NULL DEFAULT 'vercel' CHECK (platform IN ('vercel', 'netlify', 'custom')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'building', 'deploying', 'ready', 'failed', 'cancelled')),
  deploy_url TEXT,
  preview_url TEXT,
  build_log TEXT,
  error_message TEXT,
  environment TEXT DEFAULT 'preview' CHECK (environment IN ('preview', 'production')),
  commit_sha TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  triggered_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_deployments_project ON public.deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON public.deployments(status);

CREATE POLICY "Users can view own deployments"
  ON public.deployments FOR SELECT
  USING (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create deployments"
  ON public.deployments FOR INSERT
  WITH CHECK (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  ) AND triggered_by = auth.uid());

CREATE POLICY "Users can update own deployments"
  ON public.deployments FOR UPDATE
  USING (triggered_by = auth.uid());

-- ============================================================
-- 3. TEAMS / WORKSPACES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_teams_owner ON public.teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_slug ON public.teams(slug);

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);

CREATE TABLE IF NOT EXISTS public.team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON public.team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON public.team_invites(email);

-- Add team_id to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_team ON public.projects(team_id);

-- Activity feed
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN (
    'project.created', 'project.updated', 'project.deleted',
    'file.created', 'file.updated', 'file.deleted',
    'version.created', 'version.rollback',
    'review.requested', 'review.completed',
    'deploy.started', 'deploy.completed', 'deploy.failed',
    'member.invited', 'member.joined', 'member.removed',
    'team.created', 'team.updated'
  )),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_activity_team ON public.activity_feed(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_project ON public.activity_feed(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.activity_feed(user_id);

-- RLS for teams
CREATE POLICY "Team members can view team"
  ON public.teams FOR SELECT
  USING (id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

CREATE POLICY "Owner can update team"
  ON public.teams FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can delete team"
  ON public.teams FOR DELETE
  USING (owner_id = auth.uid());

-- RLS for team_members
CREATE POLICY "Team members can view members"
  ON public.team_members FOR SELECT
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage members"
  ON public.team_members FOR INSERT
  WITH CHECK (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can update members"
  ON public.team_members FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can remove members"
  ON public.team_members FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ) OR user_id = auth.uid());

-- RLS for team_invites
CREATE POLICY "Team admins can view invites"
  ON public.team_invites FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ) OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Team admins can create invites"
  ON public.team_invites FOR INSERT
  WITH CHECK (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- RLS for activity_feed
CREATE POLICY "Team members can view activity"
  ON public.activity_feed FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE POLICY "System can insert activity"
  ON public.activity_feed FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 4. HELPER FUNCTIONS
-- ============================================================

-- Accept team invite
CREATE OR REPLACE FUNCTION public.accept_team_invite(p_token TEXT)
RETURNS UUID AS $$
DECLARE
  v_invite RECORD;
  v_member_id UUID;
BEGIN
  SELECT * INTO v_invite FROM public.team_invites
  WHERE token = p_token AND accepted_at IS NULL AND expires_at > now();

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  INSERT INTO public.team_members (team_id, user_id, role, invited_by, accepted_at)
  VALUES (v_invite.team_id, auth.uid(), v_invite.role, v_invite.invited_by, now())
  ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role, accepted_at = now()
  RETURNING id INTO v_member_id;

  UPDATE public.team_invites SET accepted_at = now() WHERE id = v_invite.id;

  INSERT INTO public.activity_feed (team_id, user_id, action, metadata)
  VALUES (v_invite.team_id, auth.uid(), 'member.joined', jsonb_build_object('role', v_invite.role));

  RETURN v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get team activity
CREATE OR REPLACE FUNCTION public.get_team_activity(
  p_team_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID, action TEXT, metadata JSONB, created_at TIMESTAMPTZ,
  user_id UUID, project_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT af.id, af.action, af.metadata, af.created_at, af.user_id, af.project_id
  FROM public.activity_feed af
  WHERE af.team_id = p_team_id
  ORDER BY af.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

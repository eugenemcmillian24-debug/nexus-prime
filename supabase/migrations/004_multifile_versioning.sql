-- ============================================================
-- NEXUS PRIME — Migration 004: Multi-File Projects & Version Control
-- ============================================================

-- ============================================================
-- 1. PROJECTS TABLE (multi-file project container)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  forked_from UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  current_version INTEGER DEFAULT 1,
  last_built_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_forked_from ON public.projects(forked_from);

-- ============================================================
-- 2. PROJECT FILES TABLE (individual files in a project)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content TEXT DEFAULT '',
  language TEXT,
  is_entry_point BOOLEAN DEFAULT false,
  size_bytes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, path)
);

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project files" ON public.project_files
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid() OR is_public = true)
  );
CREATE POLICY "Users can insert project files" ON public.project_files
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update project files" ON public.project_files
  FOR UPDATE USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete project files" ON public.project_files
  FOR DELETE USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_project_files_project ON public.project_files(project_id);

-- ============================================================
-- 3. PROJECT VERSIONS TABLE (snapshots for version control)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  message TEXT NOT NULL DEFAULT 'Auto-save',
  snapshot JSONB NOT NULL, -- Array of { path, content, language }
  parent_version_id UUID REFERENCES public.project_versions(id),
  diff_summary JSONB, -- { added: [], modified: [], deleted: [] }
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, version_number)
);

ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project versions" ON public.project_versions
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid() OR is_public = true)
  );
CREATE POLICY "Users can insert project versions" ON public.project_versions
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_project_versions_project ON public.project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_versions_number ON public.project_versions(project_id, version_number DESC);

-- ============================================================
-- 4. LINK AGENT_JOBS TO PROJECTS (optional FK)
-- ============================================================
ALTER TABLE IF EXISTS public.agent_jobs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_agent_jobs_project ON public.agent_jobs(project_id);

-- ============================================================
-- 5. HELPER: Get latest version snapshot for a project
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_latest_version(p_project_id UUID)
RETURNS TABLE(version_number INTEGER, message TEXT, snapshot JSONB, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT pv.version_number, pv.message, pv.snapshot, pv.created_at
  FROM public.project_versions pv
  WHERE pv.project_id = p_project_id
  ORDER BY pv.version_number DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. HELPER: Create a new version from current project files
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_version(
  p_project_id UUID,
  p_message TEXT DEFAULT 'Auto-save'
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_next_version INTEGER;
  v_snapshot JSONB;
  v_parent_id UUID;
  v_version_id UUID;
BEGIN
  -- Get user and verify ownership
  SELECT user_id INTO v_user_id FROM public.projects WHERE id = p_project_id;
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM public.project_versions WHERE project_id = p_project_id;

  -- Get parent version
  SELECT id INTO v_parent_id
  FROM public.project_versions
  WHERE project_id = p_project_id
  ORDER BY version_number DESC LIMIT 1;

  -- Build snapshot from current files
  SELECT jsonb_agg(jsonb_build_object(
    'path', pf.path,
    'content', pf.content,
    'language', pf.language,
    'is_entry_point', pf.is_entry_point
  ) ORDER BY pf.path)
  INTO v_snapshot
  FROM public.project_files pf
  WHERE pf.project_id = p_project_id;

  -- Insert version
  INSERT INTO public.project_versions (project_id, version_number, message, snapshot, parent_version_id, created_by)
  VALUES (p_project_id, v_next_version, p_message, COALESCE(v_snapshot, '[]'::jsonb), v_parent_id, auth.uid())
  RETURNING id INTO v_version_id;

  -- Update project current version
  UPDATE public.projects SET current_version = v_next_version, updated_at = now()
  WHERE id = p_project_id;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. HELPER: Rollback to a specific version
-- ============================================================
CREATE OR REPLACE FUNCTION public.rollback_to_version(
  p_project_id UUID,
  p_version_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_snapshot JSONB;
  v_file JSONB;
BEGIN
  -- Verify ownership
  SELECT user_id INTO v_user_id FROM public.projects WHERE id = p_project_id;
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get the snapshot
  SELECT snapshot INTO v_snapshot
  FROM public.project_versions
  WHERE project_id = p_project_id AND version_number = p_version_number;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  -- Delete current files
  DELETE FROM public.project_files WHERE project_id = p_project_id;

  -- Restore files from snapshot
  FOR v_file IN SELECT * FROM jsonb_array_elements(v_snapshot)
  LOOP
    INSERT INTO public.project_files (project_id, path, content, language, is_entry_point, size_bytes)
    VALUES (
      p_project_id,
      v_file->>'path',
      v_file->>'content',
      v_file->>'language',
      (v_file->>'is_entry_point')::boolean,
      octet_length(COALESCE(v_file->>'content', ''))
    );
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

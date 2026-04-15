-- ============================================================
-- NEXUS PRIME — Migration 002: All 13 Features Schema
-- ============================================================

-- ============================================================
-- FEATURE 1: Project History & Versioning
-- (agent_jobs already exists, add version tracking)
-- ============================================================
ALTER TABLE IF EXISTS public.agent_jobs ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS public.agent_jobs ADD COLUMN IF NOT EXISTS parent_job_id UUID REFERENCES public.agent_jobs(id);
ALTER TABLE IF EXISTS public.agent_jobs ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE IF EXISTS public.agent_jobs ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_agent_jobs_user_id ON public.agent_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_parent ON public.agent_jobs(parent_job_id);

-- ============================================================
-- FEATURE 4: Iterative Refinement (conversation threads)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.build_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.build_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own threads" ON public.build_threads
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE IF EXISTS public.agent_jobs ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.build_threads(id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_thread ON public.agent_jobs(thread_id);

-- ============================================================
-- FEATURE 5: Team/Org Workspaces
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Org owners can update" ON public.organizations
  FOR UPDATE USING (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view own memberships" ON public.org_members
  FOR SELECT USING (user_id = auth.uid() OR organization_id IN (
    SELECT organization_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE TABLE IF NOT EXISTS public.org_credit_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  lifetime_credits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.org_credit_pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view pool" ON public.org_credit_pools
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- FEATURE 7: Custom Component Library
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.saved_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own components" ON public.saved_components
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view public components" ON public.saved_components
  FOR SELECT USING (is_public = true);

CREATE INDEX IF NOT EXISTS idx_saved_components_user ON public.saved_components(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_components_tags ON public.saved_components USING GIN(tags);

-- ============================================================
-- FEATURE 12: Public Gallery
-- ============================================================
CREATE TABLE IF NOT EXISTS public.published_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.agent_jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  preview_url TEXT,
  tags TEXT[] DEFAULT '{}',
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.published_builds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published builds" ON public.published_builds
  FOR SELECT USING (true);
CREATE POLICY "Users can manage own published builds" ON public.published_builds
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.build_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  build_id UUID NOT NULL REFERENCES public.published_builds(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, build_id)
);

ALTER TABLE public.build_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own likes" ON public.build_likes
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view likes" ON public.build_likes
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_published_builds_user ON public.published_builds(user_id);
CREATE INDEX IF NOT EXISTS idx_published_builds_likes ON public.published_builds(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_published_builds_tags ON public.published_builds USING GIN(tags);

-- ============================================================
-- FEATURE 13: Referral System
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  credits_awarded_referrer INTEGER DEFAULT 0,
  credits_awarded_referred INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Add referral code to profiles
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);

-- ============================================================
-- FUNCTION: Generate referral code on profile creation
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := 'NX-' || upper(substr(md5(random()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_referral_code ON public.profiles;
CREATE TRIGGER on_profile_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- ============================================================
-- FUNCTION: Complete referral and award credits
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_referral(p_referral_code TEXT, p_new_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
  bonus INTEGER := 10;
BEGIN
  SELECT referrer_id, id INTO v_referrer_id, v_referral_id
  FROM public.referrals
  WHERE referral_code = p_referral_code AND status = 'pending'
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired referral code');
  END IF;

  -- Award credits to referrer
  UPDATE public.user_credits SET balance = balance + bonus, lifetime_credits = lifetime_credits + bonus WHERE user_id = v_referrer_id;
  INSERT INTO public.user_credit_ledger (user_id, amount, type, description, balance_after)
  SELECT v_referrer_id, bonus, 'BONUS', 'Referral bonus — invited a friend', balance FROM public.user_credits WHERE user_id = v_referrer_id;

  -- Award credits to new user
  UPDATE public.user_credits SET balance = balance + bonus, lifetime_credits = lifetime_credits + bonus WHERE user_id = p_new_user_id;
  INSERT INTO public.user_credit_ledger (user_id, amount, type, description, balance_after)
  SELECT p_new_user_id, bonus, 'BONUS', 'Referral welcome bonus', balance FROM public.user_credits WHERE user_id = p_new_user_id;

  -- Update referral record
  UPDATE public.referrals SET
    referred_id = p_new_user_id,
    status = 'completed',
    credits_awarded_referrer = bonus,
    credits_awarded_referred = bonus,
    completed_at = now()
  WHERE id = v_referral_id;

  -- Update profile
  UPDATE public.profiles SET referred_by = v_referrer_id WHERE id = p_new_user_id;

  RETURN jsonb_build_object('success', true, 'credits_awarded', bonus);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

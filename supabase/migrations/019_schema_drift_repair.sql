-- 019_schema_drift_repair.sql
--
-- Background: the production database was missing several columns that
-- earlier migrations were supposed to add via `ALTER TABLE ... ADD COLUMN
-- IF NOT EXISTS`. This caused the `/api/agent` build endpoint to return
-- a bare 500 "Internal Server Error" — the agent_jobs INSERT in
-- app/api/agent/route.ts references `training_module_id`, which did not
-- exist on the table because migration 011 was only partially applied
-- (the CREATE TABLE agent_training_modules ran, but the trailing
-- ALTER TABLE ... ADD COLUMN statements did not). Similar gaps existed
-- from migrations 012, 014, and 015.
--
-- This migration re-applies all missing ADD COLUMN statements. Every
-- statement is `IF NOT EXISTS`, so it is safe to run on any database
-- regardless of whether the previous migrations were fully applied.

-- From 002_all_features.sql
ALTER TABLE IF EXISTS public.agent_jobs ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.agent_jobs ADD COLUMN IF NOT EXISTS parent_job_id UUID REFERENCES public.agent_jobs(id);
ALTER TABLE IF EXISTS public.agent_jobs ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.build_threads(id);
ALTER TABLE IF EXISTS public.agent_jobs ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE IF EXISTS public.agent_jobs ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);

-- From 011_agent_training_lab.sql (the reason /api/agent was 500ing)
ALTER TABLE public.agent_jobs ADD COLUMN IF NOT EXISTS training_module_id UUID REFERENCES public.agent_training_modules(id) ON DELETE SET NULL;
ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS agency_mode BOOLEAN DEFAULT false;

-- From 012_infrastructure_marketplace.sql
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS protocol_fee_paid BOOLEAN DEFAULT false;
ALTER TABLE public.agent_training_modules ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0;
ALTER TABLE public.agent_training_modules ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- From 014_agency_whitelabel_refinement.sql (the reason /api/user/agency was 403ing)
ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS agency_config JSONB DEFAULT '{
    "company_name": "",
    "footer_html": "",
    "support_email": "",
    "logo_url": "",
    "hide_nexus_logs": true
}'::jsonb;
COMMENT ON COLUMN public.user_credits.agency_config IS 'Stores custom branding and white-label settings for agencies.';

-- From 015_export_credentials_hardening.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_token_encrypted TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS netlify_token_encrypted TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cloudflare_token_encrypted TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cloudflare_account_id TEXT;

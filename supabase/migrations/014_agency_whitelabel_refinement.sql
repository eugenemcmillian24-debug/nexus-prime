-- 014_agency_whitelabel_refinement.sql
-- Refine Agency White-Label Mode with custom configuration

ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS agency_config JSONB DEFAULT '{
    "company_name": "",
    "footer_html": "",
    "support_email": "",
    "logo_url": "",
    "hide_nexus_logs": true
}'::jsonb;

-- Comment on column for clarity
COMMENT ON COLUMN public.user_credits.agency_config IS 'Stores custom branding and white-label settings for agencies.';

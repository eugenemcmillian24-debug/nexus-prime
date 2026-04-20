-- 015_export_credentials_hardening.sql
-- Add decentralized deployment credentials to user profiles

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_token_encrypted TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS netlify_token_encrypted TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cloudflare_token_encrypted TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cloudflare_account_id TEXT;

-- Migration to move existing plain github_token if any (optional but safe)
-- UPDATE public.profiles SET github_token_encrypted = github_token WHERE github_token IS NOT NULL;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS github_token;

COMMENT ON COLUMN public.profiles.github_token_encrypted IS 'AES-256 encrypted GitHub personal access token.';
COMMENT ON COLUMN public.profiles.netlify_token_encrypted IS 'AES-256 encrypted Netlify personal access token.';
COMMENT ON COLUMN public.profiles.cloudflare_token_encrypted IS 'AES-256 encrypted Cloudflare API token.';

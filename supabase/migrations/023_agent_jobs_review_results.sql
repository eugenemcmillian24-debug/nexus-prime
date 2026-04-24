-- ============================================================
-- 023_agent_jobs_review_results.sql
--
-- Adds a JSONB `review_results` column to `agent_jobs` so the
-- Reviewer agent (P1 #2) can record a functional review of the
-- Coder's output against the original plan. Shape:
--
--   {
--     "plan_alignment": "high" | "medium" | "low",
--     "missing_features": ["dark mode toggle", "form validation"],
--     "issues": [
--       "Counter button has no accessible label",
--       "State is reset on every re-render"
--     ],
--     "suggestions": "Consider extracting the counter logic into a custom hook...",
--     "severity": "critical" | "warning" | "info",
--     "reviewer": "claude-sonnet-4.5"
--   }
--
-- Nullable because older jobs never ran the Reviewer and we never
-- back-fill. Use `review_results IS NULL` to mean "never ran".
-- ============================================================

ALTER TABLE public.agent_jobs
  ADD COLUMN IF NOT EXISTS review_results JSONB;

COMMENT ON COLUMN public.agent_jobs.review_results IS
  'Results of the Reviewer agent performing a functional review of the build against the plan. NULL = reviewer never ran.';

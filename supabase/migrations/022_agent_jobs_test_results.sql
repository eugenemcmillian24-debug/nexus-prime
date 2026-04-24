-- ============================================================
-- 022_agent_jobs_test_results.sql
--
-- Adds a JSONB `test_results` column to `agent_jobs` so the
-- Executor agent (P1 #1 part 2) can record which generated tests
-- passed, which failed, and why. Shape:
--
--   {
--     "passed": [
--       { "path": "__tests__/lib/math.test.ts", "imports_valid": true }
--     ],
--     "failed": [
--       {
--         "path": "__tests__/components/Calculator.test.tsx",
--         "reason": "imports `computeSum` from '../Calculator' but no such export found",
--         "missing_symbols": ["computeSum"]
--       }
--     ],
--     "retry_count": 1,
--     "executor": "ast-imports"
--   }
--
-- Nullable because older jobs never ran the Executor and we never
-- back-fill. Use `test_results IS NULL` to mean "never ran".
-- ============================================================

ALTER TABLE public.agent_jobs
  ADD COLUMN IF NOT EXISTS test_results JSONB;

COMMENT ON COLUMN public.agent_jobs.test_results IS
  'Results of the Executor agent validating Tester-generated tests. NULL = executor never ran.';

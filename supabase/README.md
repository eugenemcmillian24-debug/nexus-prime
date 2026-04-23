# Supabase migrations

This directory contains the full migration history for the Nexus Prime database.
Every `.sql` file in `supabase/migrations/` must be applied, in filename order,
to every environment (production, preview, and local).

## Why this README exists

Production previously had **silent schema drift**: migrations `011`, `014`, and
`015` were only partially applied. The `CREATE TABLE` statements ran, but the
trailing `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements did not. This
caused a bare `500 Internal Server Error` from `/api/agent` (the Build
endpoint) because `agent_jobs.training_module_id` did not exist even though
the code referenced it.

Root cause: migrations were being pasted manually into the Supabase Dashboard
SQL Editor, with no tracking of what had been applied. The docs in
`DEPLOYMENT.md` only mentioned `001` and `002`, so later migrations were
applied ad-hoc (or not at all, or halfway).

**Please stop using the SQL Editor for migrations. Use the Supabase CLI.**

## One-time setup

```bash
# 1. Install the Supabase CLI
# macOS:   brew install supabase/tap/supabase
# Linux:   curl -fsSL https://supabase.com/install.sh | sh
# Windows: scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase

# 2. Authenticate (opens browser)
supabase login

# 3. Link this repo to the Nexus Prime Supabase project (ref: emxwzmduxjtnrtndvpcg)
supabase link --project-ref emxwzmduxjtnrtndvpcg
```

## Applying migrations

```bash
# Push every migration that hasn't been applied yet.
# The CLI uses supabase_migrations.schema_migrations as its tracking table,
# so it's idempotent and only runs each file once.
supabase db push
```

Never run `supabase db reset` against production — it will drop and recreate
the database.

## Authoring a new migration

```bash
# Creates a timestamped .sql file in supabase/migrations/
supabase migration new short_name_for_change
```

Write DDL in the new file. Prefer `ALTER TABLE IF EXISTS ... ADD COLUMN IF NOT
EXISTS ...` so partial-apply scenarios don't abort the rest of the script —
see `019_schema_drift_repair.sql` for the pattern.

## Troubleshooting

- **`relation ... does not exist`**: a prior migration was skipped. Run
  `supabase db push` after ensuring every predecessor has been applied. The
  CLI will no-op anything already in `schema_migrations`, so re-running is
  safe.
- **Column missing in prod even though the migration file adds it**: probably
  the drift scenario described above. Run `019_schema_drift_repair.sql` (or
  the next `*_drift_repair.sql` if one exists) to re-apply all missing
  `ADD COLUMN` statements idempotently.
- **Audit drift live**: the SQL below lists columns your migrations expect
  but are missing from the live schema (adjust for the schema you care about):
  ```sql
  -- In the Supabase SQL Editor:
  select table_name, column_name
  from information_schema.columns
  where table_schema = 'public'
  order by table_name, ordinal_position;
  ```
  Diff that output against the `CREATE TABLE`/`ALTER TABLE ADD COLUMN`
  statements in `supabase/migrations/`. Any expected-but-missing column is
  drift.

-- NEXUS PRIME — Migration 013: Schema Reconciliation
--
-- Background: migrations 001_initial_schema.sql and 010_monetization_engine.sql
-- both contain `CREATE TABLE IF NOT EXISTS public.user_credits` and
-- `CREATE TABLE IF NOT EXISTS public.subscriptions` with slightly different
-- column definitions. Whichever migration runs first wins — the second is
-- silently skipped, which means a fresh environment can end up with subtly
-- different schemas than a long-running one.
--
-- Additionally, migration 013 was missing from the sequence entirely (jump
-- from 012 → 014), which some migration runners treat as an error.
--
-- This file fills the gap AND defensively adds any columns that either
-- definition expects, so both fresh and long-running databases converge on
-- the same schema.

-- user_credits: ensure all columns expected by the app exist regardless of
-- whether 001 or 010 created the table first.
alter table public.user_credits
  add column if not exists balance integer default 0,
  add column if not exists lifetime_credits integer default 0,
  add column if not exists tier text default 'free',
  add column if not exists subscription_id text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists updated_at timestamptz default now();

-- subscriptions: reconcile the two definitions. 001 uses a UUID id +
-- stripe_subscription_id; 010 uses the Stripe id as the primary key. Add
-- both so either code path keeps working.
alter table public.subscriptions
  add column if not exists stripe_subscription_id text,
  add column if not exists price_id text,
  add column if not exists quantity integer,
  add column if not exists cancel_at_period_end boolean,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists updated_at timestamptz default now();

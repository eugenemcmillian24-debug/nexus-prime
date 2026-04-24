# NEXUS PRIME: Deployment Guide

## 1. Supabase Setup

**Do not paste migrations into the Supabase SQL Editor one at a time.** That
approach silently allowed `011`, `014`, and `015` to partially apply in
production, which caused `/api/agent` to return a bare 500 "Internal Server
Error" on every Build request. Use the Supabase CLI instead — it tracks
applied migrations in `supabase_migrations.schema_migrations` and is
idempotent.

```bash
# 1. Install the Supabase CLI (pick one)
brew install supabase/tap/supabase                              # macOS
curl -fsSL https://supabase.com/install.sh | sh                 # Linux
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase  # Windows

# 2. Authenticate and link this repo to the project
supabase login
supabase link --project-ref <your-project-ref>

# 3. Apply every migration under supabase/migrations/ that hasn't been applied yet
supabase db push
```

See [`supabase/README.md`](supabase/README.md) for the full workflow,
including authoring new migrations and auditing for schema drift.

## 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in all values:

```env
# Supabase (Public — safe for browser)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Supabase (Secret — server-side only)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI / LLM Keys
OPENCODE_ZEN_API_KEY=your_zen_key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# Vercel Deployment (One-Click Deploy feature)
VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=your_team_id               # Optional — leave blank for personal accounts

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 3. Stripe Webhook Configuration
- Set up a webhook pointing to: `https://your-domain.com/api/webhooks/stripe`
- Select event: `checkout.session.completed`

## 4. Local Development
```bash
npm install
npm run dev
```

## 5. Vercel Deployment
1. Push to GitHub
2. Import project in Vercel
3. Add all environment variables from `.env.example`
4. Deploy

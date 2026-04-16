# NEXUS PRIME: Deployment Guide

## 1. Supabase Setup
Run the following SQL scripts in your Supabase SQL Editor:
1. `supabase/migrations/001_initial_schema.sql` (Core Tables)
2. `supabase/migrations/002_all_features.sql` (All Feature Tables)

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
GROQ_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key
GOOGLE_AI_KEY=your_google_ai_key          # Required for Gemini Vision

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

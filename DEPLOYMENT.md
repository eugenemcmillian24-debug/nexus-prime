# NEXUS PRIME: Deployment Guide

## 1. Supabase Setup
Run the following SQL scripts in your Supabase SQL Editor:
1. `packages/database/schema.sql` (Core Tables)
2. `packages/database/stripe_hooks.sql` (Billing Triggers)

## 2. Environment Variables (.env)
Create a `.env` file in `apps/web/` with the following:

```env
# Supabase (Public)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Supabase (Secret)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Keys
GROQ_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

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

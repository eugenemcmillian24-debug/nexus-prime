// Runtime environment variable validation
// Fails fast on startup if required vars are missing

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `❌ Missing required environment variable: ${name}\n` +
      `   See .env.example for the full list of required variables.`
    );
  }
  return value;
}

function optional(name: string, fallback: string = ""): string {
  return process.env[name] || fallback;
}

// Validate on import (server-side only)
export const env = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),

  // Stripe
  STRIPE_SECRET_KEY: required("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: required("STRIPE_WEBHOOK_SECRET"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: required("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  STRIPE_STARTER_PRICE_ID: required("STRIPE_STARTER_PRICE_ID"),
  STRIPE_PRO_PRICE_ID: required("STRIPE_PRO_PRICE_ID"),
  STRIPE_ENTERPRISE_PRICE_ID: required("STRIPE_ENTERPRISE_PRICE_ID"),
  STRIPE_TOPUP_50_PRICE_ID: required("STRIPE_TOPUP_50_PRICE_ID"),
  STRIPE_TOPUP_250_PRICE_ID: required("STRIPE_TOPUP_250_PRICE_ID"),
  STRIPE_TOPUP_1000_PRICE_ID: required("STRIPE_TOPUP_1000_PRICE_ID"),

  // AI Providers (optional — users provide their own keys)
  OPENAI_API_KEY: optional("OPENAI_API_KEY"),

  // Site
  NEXT_PUBLIC_SITE_URL: optional("NEXT_PUBLIC_SITE_URL", "https://nexus-prime-woad.vercel.app"),
} as const;

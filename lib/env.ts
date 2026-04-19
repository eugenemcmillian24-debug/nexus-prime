// Runtime environment variable validation
// Uses lazy getters so validation runs on first access, not at import time.
// This prevents build failures when env vars aren't available during
// Next.js static analysis / page data collection.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `\u274c Missing required environment variable: ${name}\n` +
      `   See .env.example for the full list of required variables.`
    );
  }
  return value;
}

function optional(name: string, fallback: string = ""): string {
  return process.env[name] || fallback;
}

function lazyRequired(name: string) {
  return { get: () => required(name), enumerable: true };
}

function lazyOptional(name: string, fallback: string = "") {
  return { get: () => optional(name, fallback), enumerable: true };
}

// Validate lazily on first property access (not at import time)
export const env: {
  readonly NEXT_PUBLIC_SUPABASE_URL: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly STRIPE_SECRET_KEY: string;
  readonly STRIPE_WEBHOOK_SECRET: string;
  readonly NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  readonly STRIPE_STARTER_PRICE_ID: string;
  readonly STRIPE_PRO_PRICE_ID: string;
  readonly STRIPE_ENTERPRISE_PRICE_ID: string;
  readonly STRIPE_TOPUP_50_PRICE_ID: string;
  readonly STRIPE_TOPUP_250_PRICE_ID: string;
  readonly STRIPE_TOPUP_1000_PRICE_ID: string;
  readonly OPENAI_API_KEY: string;
  readonly NEXT_PUBLIC_SITE_URL: string;
} = Object.defineProperties({} as any, {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: lazyRequired("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: lazyRequired("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: lazyRequired("SUPABASE_SERVICE_ROLE_KEY"),

  // Stripe
  STRIPE_SECRET_KEY: lazyRequired("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: lazyRequired("STRIPE_WEBHOOK_SECRET"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: lazyRequired("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  STRIPE_STARTER_PRICE_ID: lazyRequired("STRIPE_STARTER_PRICE_ID"),
  STRIPE_PRO_PRICE_ID: lazyRequired("STRIPE_PRO_PRICE_ID"),
  STRIPE_ENTERPRISE_PRICE_ID: lazyRequired("STRIPE_ENTERPRISE_PRICE_ID"),
  STRIPE_TOPUP_50_PRICE_ID: lazyRequired("STRIPE_TOPUP_50_PRICE_ID"),
  STRIPE_TOPUP_250_PRICE_ID: lazyRequired("STRIPE_TOPUP_250_PRICE_ID"),
  STRIPE_TOPUP_1000_PRICE_ID: lazyRequired("STRIPE_TOPUP_1000_PRICE_ID"),

  // AI Providers (optional)
  OPENAI_API_KEY: lazyOptional("OPENAI_API_KEY"),

  // Site
  NEXT_PUBLIC_SITE_URL: lazyOptional("NEXT_PUBLIC_SITE_URL", "https://nexus-prime-woad.vercel.app"),
});

"use client";

import { useState } from "react";

type SubscriptionTier = "Starter" | "PRO" | "Enterprise";
type TopupPack = "pack_50" | "pack_250" | "pack_1000";

interface TierInfo {
  id: SubscriptionTier;
  name: string;
  price: string;
  credits: string;
  blurb: string;
  features: string[];
  highlight?: boolean;
}

interface PackInfo {
  id: TopupPack;
  name: string;
  price: string;
  credits: string;
  blurb: string;
}

const TIERS: TierInfo[] = [
  {
    id: "Starter",
    name: "Starter",
    price: "$9",
    credits: "100",
    blurb: "For individual builders and rapid prototyping.",
    features: [
      "100 credits / month",
      "Community templates",
      "Standard models",
      "Basic support",
    ],
  },
  {
    id: "PRO",
    name: "PRO",
    price: "$29",
    credits: "500",
    blurb: "For power users building complex multi-page apps.",
    features: [
      "500 credits / month",
      "All seed templates",
      "Priority processing",
      "Advanced reasoning models",
      "Custom deployment hooks",
      "Analytics, Team, Domains, Webhooks, Export, API Keys",
    ],
    highlight: true,
  },
  {
    id: "Enterprise",
    name: "Enterprise",
    price: "$99",
    credits: "2000",
    blurb: "Maximum scale for teams and professional studios.",
    features: [
      "2000 credits / month",
      "Team workspaces",
      "24/7 priority support",
      "White-label deployments",
      "Full API access",
    ],
  },
];

const PACKS: PackInfo[] = [
  { id: "pack_50", name: "Starter Pack", price: "$5", credits: "50", blurb: "Top-off for a single build sprint." },
  { id: "pack_250", name: "Builder Pack", price: "$19", credits: "250", blurb: "Best value per credit for heavy builders." },
  { id: "pack_1000", name: "Studio Pack", price: "$59", credits: "1000", blurb: "Bulk credits for agencies and teams." },
];

async function startCheckout(
  body: { type: "subscription"; tier: SubscriptionTier } | { type: "topup"; packId: TopupPack },
): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data.error || `Checkout failed (${res.status}).` };
    }
    return { url: data.url };
  } catch (err: any) {
    return { error: err?.message || "Network error reaching payment gateway." };
  }
}

export default function PricingView() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (tier: SubscriptionTier) => {
    setLoadingId(`sub:${tier}`);
    setError(null);
    const { url, error: err } = await startCheckout({ type: "subscription", tier });
    if (err) {
      setError(err);
      setLoadingId(null);
      return;
    }
    if (url) {
      window.location.href = url;
    } else {
      setError("Checkout returned no redirect URL.");
      setLoadingId(null);
    }
  };

  const handleTopup = async (packId: TopupPack) => {
    setLoadingId(`pack:${packId}`);
    setError(null);
    const { url, error: err } = await startCheckout({ type: "topup", packId });
    if (err) {
      setError(err);
      setLoadingId(null);
      return;
    }
    if (url) {
      window.location.href = url;
    } else {
      setError("Checkout returned no redirect URL.");
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-10">
      {error && (
        <div className="border border-red-500/30 bg-red-500/5 text-red-400 text-[11px] font-bold uppercase tracking-widest py-3 px-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Subscription tiers */}
      <section className="space-y-6">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-[#00ff88] tracking-[0.3em] uppercase">Subscription Plans</div>
          <h3 className="text-xl font-bold text-white uppercase tracking-widest">Recurring Allocations</h3>
          <p className="text-[11px] text-[#666] font-medium">Billed monthly via Stripe. Cancel anytime.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => {
            const loading = loadingId === `sub:${tier.id}`;
            return (
              <div
                key={tier.id}
                className={`relative p-8 rounded-2xl border flex flex-col gap-6 transition-all ${
                  tier.highlight
                    ? "border-[#00ff8844] bg-[#0a0a0a] shadow-[0_0_40px_rgba(0,255,136,0.08)]"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00ff88] text-black px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                    Most Deployed
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-[10px] font-black text-[#525252] tracking-widest uppercase">
                    {tier.name} Protocol
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white tracking-tighter">{tier.price}</span>
                    <span className="text-xs font-bold text-[#444]">/MO</span>
                  </div>
                  <div className="text-[11px] text-[#666] font-medium">{tier.blurb}</div>
                </div>

                <div className="p-4 rounded-lg bg-white/[0.03] border border-white/5 space-y-1">
                  <div className="text-[9px] font-black text-[#444] uppercase tracking-widest text-center">
                    Monthly Credits
                  </div>
                  <div className="text-2xl font-black text-[#00ff88] text-center tracking-tighter">
                    {tier.credits}
                  </div>
                </div>

                <ul className="space-y-2 flex-1">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-3 text-[11px] font-medium text-[#a3a3a3]"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]/40 border border-[#00ff88] flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(tier.id)}
                  disabled={loading || loadingId !== null}
                  className={`w-full py-3 rounded-lg font-black uppercase tracking-[0.2em] text-[10px] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    tier.highlight
                      ? "bg-[#00ff88] text-black hover:bg-[#00cc6d] shadow-lg shadow-[#00ff88]/20"
                      : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {loading ? "Redirecting to Stripe…" : `Subscribe to ${tier.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* One-off top-ups */}
      <section className="space-y-6">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-[#00ff88] tracking-[0.3em] uppercase">One-off Top-ups</div>
          <h3 className="text-xl font-bold text-white uppercase tracking-widest">Credit Packs</h3>
          <p className="text-[11px] text-[#666] font-medium">
            Pay once, credits never expire. Great for bursty workloads.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PACKS.map((pack) => {
            const loading = loadingId === `pack:${pack.id}`;
            return (
              <div
                key={pack.id}
                className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col gap-4"
              >
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-[#525252] tracking-widest uppercase">
                    {pack.name}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white tracking-tighter">{pack.price}</span>
                    <span className="text-xs font-bold text-[#444]">one-time</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                  <div className="text-[9px] font-black text-[#444] uppercase tracking-widest">Credits</div>
                  <div className="text-xl font-black text-[#00ff88] tracking-tighter">+{pack.credits}</div>
                </div>

                <p className="text-[11px] text-[#666] font-medium flex-1">{pack.blurb}</p>

                <button
                  onClick={() => handleTopup(pack.id)}
                  disabled={loading || loadingId !== null}
                  className="w-full py-2.5 rounded-lg font-black uppercase tracking-[0.2em] text-[10px] bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Redirecting to Stripe…" : "Buy Credits"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-[10px] text-[#444] font-medium tracking-wider uppercase">
        Payments processed securely by Stripe. Admin accounts are not charged.
      </p>
    </div>
  );
}

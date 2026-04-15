"use client";

import { useState, useEffect } from "react";
import { createClient, User } from "@supabase/supabase-js";
import {
  BarChart3,
  Zap,
  Clock,
  TrendingUp,
  Code,
  CreditCard,
  Gift,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";

const supabase = (typeof window !== 'undefined' || process.env.NEXT_PUBLIC_SUPABASE_URL) ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
) : null as any;

interface DashboardStats {
  totalBuilds: number;
  creditsUsed: number;
  creditsRemaining: number;
  tier: string;
  recentBuilds: any[];
  ledger: any[];
  referralCode: string | null;
  referralCount: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        window.location.href = "/";
        return;
      }
      setUser(session.user);

      // Fetch all dashboard data in parallel
      const [buildsRes, creditsRes, ledgerRes, profileRes, referralsRes] =
        await Promise.all([
          supabase
            .from("agent_jobs")
            .select("*")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("user_credits")
            .select("*")
            .eq("user_id", session.user.id)
            .single(),
          supabase
            .from("user_credit_ledger")
            .select("*")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("profiles")
            .select("referral_code")
            .eq("id", session.user.id)
            .single(),
          supabase
            .from("referrals")
            .select("id")
            .eq("referrer_id", session.user.id)
            .eq("status", "completed"),
        ]);

      setStats({
        totalBuilds: buildsRes.data?.length || 0,
        creditsUsed: (creditsRes.data?.lifetime_credits ?? creditsRes.data?.balance ?? 0)
          ? (creditsRes.data?.lifetime_credits ?? 0) - (creditsRes.data?.balance ?? 0)
          : 0,
        creditsRemaining: creditsRes.data?.balance || 0,
        tier: creditsRes.data?.tier || "free",
        recentBuilds: buildsRes.data || [],
        ledger: ledgerRes.data || [],
        referralCode: profileRes.data?.referral_code || null,
        referralCount: referralsRes.data?.length || 0,
      });
      setLoading(false);
    };
    init();
  }, []);

  const copyReferralLink = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(
        `${window.location.origin}?ref=${stats.referralCode}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-[#00ff88] animate-pulse">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[#444] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold tracking-[0.2em] uppercase">
              Dashboard
            </h1>
          </div>
          <span className="text-xs text-[#00ff88] uppercase tracking-widest border border-[#00ff88]/20 px-3 py-1 rounded-sm">
            {stats?.tier}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Code className="w-5 h-5" />}
            label="Total Builds"
            value={stats?.totalBuilds || 0}
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="Credits Remaining"
            value={stats?.creditsRemaining || 0}
            accent
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Credits Used"
            value={stats?.creditsUsed || 0}
          />
          <StatCard
            icon={<Gift className="w-5 h-5" />}
            label="Friends Referred"
            value={stats?.referralCount || 0}
          />
        </div>

        {/* Referral Card */}
        {stats?.referralCode && (
          <div className="border border-[#1a1a1a] bg-[#0a0a0a] rounded-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#888] mb-2">
                  Invite Friends — Earn 10 Credits Each
                </h3>
                <p className="text-[#444] text-xs">
                  Share your referral link. Both you and your friend get 10 free
                  credits.
                </p>
              </div>
              <button
                onClick={copyReferralLink}
                className="flex items-center gap-2 px-4 py-2 border border-[#00ff88]/30 text-[#00ff88] text-sm hover:bg-[#00ff88]/10 rounded-sm transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied!" : stats.referralCode}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Builds */}
          <div className="border border-[#1a1a1a] bg-[#0a0a0a] rounded-sm">
            <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00ff88]" />
              <span className="text-xs uppercase tracking-widest font-bold text-[#888]">
                Recent Builds
              </span>
            </div>
            <div className="divide-y divide-[#111]">
              {stats?.recentBuilds.length === 0 && (
                <div className="p-6 text-center text-[#444] text-sm">
                  No builds yet. Start creating!
                </div>
              )}
              {stats?.recentBuilds.map((build: any) => (
                <div
                  key={build.id}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm text-white truncate max-w-[300px]">
                      {build.title || build.prompt?.slice(0, 60) || "Untitled"}
                    </p>
                    <p className="text-xs text-[#444]">
                      {new Date(build.created_at).toLocaleDateString()} · v
                      {build.version || 1}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-sm ${
                      build.status === "completed"
                        ? "text-[#00ff88] bg-[#00ff88]/10"
                        : build.status === "failed"
                          ? "text-red-400 bg-red-400/10"
                          : "text-yellow-400 bg-yellow-400/10"
                    }`}
                  >
                    {build.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Credit Ledger */}
          <div className="border border-[#1a1a1a] bg-[#0a0a0a] rounded-sm">
            <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#00ff88]" />
              <span className="text-xs uppercase tracking-widest font-bold text-[#888]">
                Credit History
              </span>
            </div>
            <div className="divide-y divide-[#111] max-h-[400px] overflow-y-auto">
              {stats?.ledger.length === 0 && (
                <div className="p-6 text-center text-[#444] text-sm">
                  No transactions yet.
                </div>
              )}
              {stats?.ledger.map((entry: any) => (
                <div
                  key={entry.id}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm text-[#888]">{entry.description}</p>
                    <p className="text-xs text-[#333]">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-mono ${entry.amount > 0 ? "text-[#00ff88]" : "text-red-400"}`}
                  >
                    {entry.amount > 0 ? "+" : ""}
                    {entry.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="border border-[#1a1a1a] bg-[#0a0a0a] rounded-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={accent ? "text-[#00ff88]" : "text-[#444]"}>
          {icon}
        </span>
        <span className="text-xs uppercase tracking-widest text-[#444]">
          {label}
        </span>
      </div>
      <p
        className={`text-2xl font-bold ${accent ? "text-[#00ff88]" : "text-white"}`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

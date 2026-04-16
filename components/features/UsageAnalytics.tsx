"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Zap, Rocket, Clock, CreditCard } from "lucide-react";

interface AnalyticsData {
  total_generations: number;
  total_refinements: number;
  total_deployments: number;
  total_credits_used: number;
  daily_activity: { day: string; count: number; credits: number }[];
  model_usage: { model: string; count: number }[];
}

export default function UsageAnalytics({
  userId,
  supabase,
}: {
  userId: string;
  supabase: any;
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const { data: result } = await supabase.rpc("get_user_analytics", {
      p_user_id: userId,
      p_days: period,
    });
    setData(result);
    setLoading(false);
  };

  if (loading || !data) {
    return (
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-8 text-center">
        <div className="text-[#333] text-xs animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  const maxDailyCount = Math.max(...(data.daily_activity?.map((d) => d.count) || [1]), 1);

  const stats = [
    { label: "Generations", value: data.total_generations, icon: Zap, color: "#00ff88" },
    { label: "Refinements", value: data.total_refinements, icon: TrendingUp, color: "#00aaff" },
    { label: "Deployments", value: data.total_deployments, icon: Rocket, color: "#ff8800" },
    { label: "Credits Used", value: data.total_credits_used, icon: CreditCard, color: "#ff4488" },
  ];

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-[#00ff88]" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-white">Usage Analytics</span>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setPeriod(days)}
              className={`px-2 py-1 text-[9px] uppercase font-bold tracking-wider rounded-[2px] transition-all ${
                period === days
                  ? "bg-[#00ff8822] text-[#00ff88] border border-[#00ff8844]"
                  : "text-[#444] hover:text-[#888] border border-transparent"
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#1a1a1a]">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#0a0a0a] p-4 flex flex-col items-center gap-1">
            <stat.icon size={16} style={{ color: stat.color }} />
            <span className="text-xl font-bold text-white font-mono">{stat.value}</span>
            <span className="text-[8px] uppercase tracking-widest text-[#444]">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Activity Chart (CSS-based bar chart) */}
      {data.daily_activity && data.daily_activity.length > 0 && (
        <div className="p-4 border-t border-[#1a1a1a]">
          <div className="text-[9px] uppercase tracking-widest text-[#333] mb-3 flex items-center gap-1">
            <Clock size={10} /> Daily Activity
          </div>
          <div className="flex items-end gap-[2px] h-24">
            {data.daily_activity.map((day, i) => (
              <div
                key={i}
                className="flex-1 bg-[#00ff8833] hover:bg-[#00ff8866] rounded-t-[1px] transition-all cursor-pointer group relative"
                style={{ height: `${(day.count / maxDailyCount) * 100}%`, minHeight: day.count > 0 ? "4px" : "0" }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#111] border border-[#1a1a1a] rounded text-[8px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {day.day}: {day.count} actions, {day.credits}cr
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model Usage */}
      {data.model_usage && data.model_usage.length > 0 && (
        <div className="p-4 border-t border-[#1a1a1a]">
          <div className="text-[9px] uppercase tracking-widest text-[#333] mb-3">Model Distribution</div>
          <div className="space-y-2">
            {data.model_usage.map((m, i) => {
              const totalModels = data.model_usage.reduce((sum, x) => sum + x.count, 0);
              const pct = totalModels > 0 ? (m.count / totalModels) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] text-[#888] font-mono w-32 truncate">{m.model || "Unknown"}</span>
                  <div className="flex-1 bg-[#111] rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-[#00ff88] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[9px] text-[#444] font-mono w-12 text-right">{m.count}×</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

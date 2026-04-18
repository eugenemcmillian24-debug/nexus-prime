"use client";

import React, { memo, useState } from "react";
import { 
  Zap, 
  Activity, 
  BarChart3, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  ArrowUpRight,
  Code,
  Layers,
  Cpu,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Optimization {
  id: string;
  type: "render" | "bundle" | "api" | "asset" | "logic";
  impact: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  file: string;
  recommendation: string;
  fix?: string;
}

interface PerformanceMonitorProps {
  projectId: string;
}

function PerformanceMonitor({ projectId }: PerformanceMonitorProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Optimization[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReport(data.optimizations || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "critical": return "text-red-500 bg-red-500/10 border-red-500/20";
      case "high": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "medium": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      default: return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white font-mono text-sm border-l border-white/10 w-full max-w-md">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#080808]">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#00ff88]" />
          <h2 className="font-bold tracking-tighter uppercase">Performance Agent</h2>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="p-2 hover:bg-white/5 rounded-md transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-px bg-white/10 border-b border-white/10">
        <div className="p-4 bg-black/40 flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-widest">Efficiency</span>
          <span className="text-xl font-bold text-[#00ff88]">94.2%</span>
        </div>
        <div className="p-4 bg-black/40 flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-widest">Bundle Size</span>
          <span className="text-xl font-bold text-white">124KB</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!report && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
            <Zap className="w-12 h-12 mb-2" />
            <p>Ready to optimize your application.</p>
            <button
              onClick={runAnalysis}
              className="px-4 py-2 bg-[#00ff88] text-black font-bold rounded-sm hover:bg-[#00cc6e] transition-colors uppercase text-xs"
            >
              Run Performance Audit
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#00ff88]" />
            <p className="text-xs animate-pulse">Analyzing rendering trees & data flows...</p>
          </div>
        )}

        {report && report.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-[#00ff88]" />
            <p className="text-[#00ff88]">Peak Performance. No bottlenecks detected.</p>
          </div>
        )}

        {report && report.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-sm">
              <BarChart3 className="w-4 h-4 text-yellow-500" />
              <span className="text-yellow-500 font-bold uppercase text-[10px]">
                {report.length} Optimizations Recommended
              </span>
            </div>

            {report.map((opt) => (
              <div 
                key={opt.id}
                className="border border-white/10 bg-white/5 rounded-sm overflow-hidden"
              >
                <div className="p-3 border-b border-white/10 flex items-center justify-between">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                    getImpactColor(opt.impact)
                  )}>
                    {opt.impact} impact
                  </span>
                  <span className="text-white/40 text-[10px] uppercase tracking-widest">{opt.type}</span>
                </div>
                
                <div className="p-3 space-y-2">
                  <h3 className="font-bold text-white leading-tight">{opt.title}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-[#00ff88]">
                    <Code className="w-3 h-3" />
                    <span>{opt.file}</span>
                  </div>
                  <p className="text-white/60 text-[11px] leading-relaxed italic">
                    "{opt.description}"
                  </p>
                  
                  <div className="mt-4 p-2 bg-black/40 border border-white/5 rounded-sm text-[10px] text-white/80">
                    <p className="font-bold text-[#00ff88] mb-1 uppercase tracking-widest">Recommendation:</p>
                    {opt.recommendation}
                  </div>

                  {opt.fix && (
                    <div className="mt-2 bg-black border border-white/5 p-2 rounded-sm overflow-x-auto">
                      <pre className="text-[9px] text-white/40 leading-tight">
                        <code>{opt.fix}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer / Devices */}
      <div className="p-4 border-t border-white/10 bg-[#080808]">
        <div className="flex items-center justify-between text-white/20">
          <Layers className="w-4 h-4" />
          <Cpu className="w-4 h-4" />
          <Smartphone className="w-4 h-4" />
          <BarChart3 className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export default memo(PerformanceMonitor);

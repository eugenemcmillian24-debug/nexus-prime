"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Lock, 
  Eye, 
  RefreshCw,
  Zap,
  FileCode,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Vulnerability {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  file: string;
  line: number;
  recommendation: string;
}

interface SecurityShieldProps {
  projectId: string;
  onFixApplied?: (filePath: string, newCode: string) => void;
}

export default function SecurityShield({ projectId, onFixApplied }: SecurityShieldProps) {
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState<string | null>(null);
  const [report, setReport] = useState<Vulnerability[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/security-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, action: "audit" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReport(data.report || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFix = async (vuln: Vulnerability) => {
    setFixing(vuln.id);
    try {
      const res = await fetch("/api/agent/security-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          projectId, 
          action: "fix", 
          vulnerability: vuln, 
          filePath: vuln.file 
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      if (onFixApplied) {
        onFixApplied(vuln.file, data.fixedCode);
      }
      
      // Remove fixed vulnerability from report
      setReport(prev => prev ? prev.filter(v => v.id !== vuln.id) : null);
    } catch (err: any) {
      alert(`Fix failed: ${err.message}`);
    } finally {
      setFixing(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
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
          <Shield className="w-5 h-5 text-[#00ff88]" />
          <h2 className="font-bold tracking-tighter uppercase">Shield-Mode Audit</h2>
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          className="p-2 hover:bg-white/5 rounded-md transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!report && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
            <Lock className="w-12 h-12 mb-2" />
            <p>Ready to secure your project.</p>
            <button
              onClick={runAudit}
              className="px-4 py-2 bg-[#00ff88] text-black font-bold rounded-sm hover:bg-[#00cc6e] transition-colors uppercase text-xs"
            >
              Start Security Scan
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin text-[#00ff88]" />
            <p className="text-xs animate-pulse">Analyzing codebase for vulnerabilities...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-xs">
            <p className="font-bold">Error during audit:</p>
            <p>{error}</p>
          </div>
        )}

        {report && report.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-[#00ff88]" />
            <p className="text-[#00ff88]">System Secure. No vulnerabilities found.</p>
          </div>
        )}

        {report && report.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-sm">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-red-500 font-bold uppercase text-[10px]">
                {report.length} Issues Detected
              </span>
            </div>

            {report.map((vuln) => (
              <div 
                key={vuln.id}
                className="border border-white/10 bg-white/5 rounded-sm overflow-hidden"
              >
                <div className="p-3 border-b border-white/10 flex items-center justify-between">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                    getSeverityColor(vuln.severity)
                  )}>
                    {vuln.severity}
                  </span>
                  <span className="text-white/40 text-[10px]">{vuln.file}:{vuln.line}</span>
                </div>
                
                <div className="p-3 space-y-2">
                  <h3 className="font-bold text-white leading-tight">{vuln.title}</h3>
                  <p className="text-white/60 text-[11px] leading-relaxed italic">
                    "{vuln.description}"
                  </p>
                  
                  <div className="mt-4 p-2 bg-black/40 border border-white/5 rounded-sm text-[10px] text-white/80">
                    <p className="font-bold text-[#00ff88] mb-1">RECOMMENDATION:</p>
                    {vuln.recommendation}
                  </div>

                  <button
                    onClick={() => applyFix(vuln)}
                    disabled={!!fixing}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-white text-black font-bold rounded-sm hover:bg-[#00ff88] transition-all uppercase text-[10px] group disabled:opacity-50"
                  >
                    {fixing === vuln.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3 fill-current group-hover:text-black" />
                    )}
                    {fixing === vuln.id ? "Applying Fix..." : "Apply Auto-Fix"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {report && report.length > 0 && (
        <div className="p-4 border-t border-white/10 bg-[#080808]">
          <p className="text-[10px] text-white/40 text-center uppercase tracking-widest">
            NEXUS PRIME Security Shield Active
          </p>
        </div>
      )}
    </div>
  );
}

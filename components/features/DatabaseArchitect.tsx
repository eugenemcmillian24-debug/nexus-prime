"use client";

import React, { useState } from "react";
import { 
  Database, 
  Table, 
  ShieldCheck, 
  Code2, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Copy,
  Terminal as TerminalIcon
} from "lucide-react";

interface DatabaseArchitectProps {
  projectId: string;
  onGenerationComplete?: () => void;
}

export default function DatabaseArchitect({ projectId, onGenerationComplete }: DatabaseArchitectProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ analysis: string; sql: string; files: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/agent/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, projectId }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        if (onGenerationComplete) onGenerationComplete();
      } else {
        setError(data.error || "Failed to generate database schema.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-[#e5e5e5] p-10 font-mono overflow-auto">
      <div className="max-w-4xl mx-auto w-full space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00ff8811] border border-[#00ff8822] rounded-sm flex items-center justify-center text-[#00ff88]">
              <Database size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tighter uppercase">Full-Stack Database Architect</h2>
              <p className="text-[#737373] text-xs uppercase tracking-widest">PostgreSQL Schema & Server Actions Pipeline</p>
            </div>
          </div>
          <p className="text-sm text-[#a3a3a3] leading-relaxed">
            Describe your data model or application requirements. The agent will generate optimized PostgreSQL migrations, 
            apply RLS policies, and scaffold Next.js Server Actions for CRUD operations.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleGenerate} className="space-y-6 bg-[#0a0a0a] border border-[#1a1a1a] p-8 rounded-sm">
          <div className="space-y-4">
            <label className="block text-[10px] text-[#525252] uppercase tracking-[0.2em] font-bold">
              Data Model Requirements
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Build a database for a library system with books, authors, and rentals. Include user ownership policies."
              className="w-full h-32 bg-[#050505] border border-[#262626] p-4 text-sm outline-none focus:border-[#00ff88] transition-colors rounded-sm resize-none custom-scrollbar"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="w-full bg-[#00ff88] text-black py-4 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-[#00cc6d] transition-all disabled:opacity-50 disabled:grayscale"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Architecting Schema...
              </>
            ) : (
              <>
                Generate Full-Stack Architecture <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="bg-[#ef444408] border border-[#ef444422] p-6 space-y-2 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 text-[#ef4444]">
              <AlertCircle size={20} />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Architecture Generation Failed</span>
            </div>
            <p className="text-[11px] text-[#737373] uppercase leading-relaxed">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* AI Analysis */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#00ff88] uppercase tracking-[0.3em]">Architect's Analysis</h3>
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 text-[11px] text-[#a3a3a3] leading-relaxed whitespace-pre-wrap">
                {result.analysis}
              </div>
            </div>

            {/* SQL Migration */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-[0.3em]">PostgreSQL Migration</h3>
                <button 
                  onClick={() => copyToClipboard(result.sql)}
                  className="text-[9px] text-[#444] hover:text-white flex items-center gap-1 uppercase tracking-widest transition-colors"
                >
                  <Copy size={12} /> Copy SQL
                </button>
              </div>
              <div className="relative group">
                <pre className="bg-[#050505] border border-[#1a1a1a] p-6 text-[10px] text-[#888] overflow-auto max-h-[300px] custom-scrollbar">
                  <code>{result.sql}</code>
                </pre>
                <div className="absolute top-4 right-4 text-[8px] text-[#222] uppercase tracking-widest font-bold">Idempotent SQL</div>
              </div>
            </div>

            {/* Generated Files (Server Actions / Types) */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-[0.3em]">Next.js Implementation</h3>
              <div className="grid grid-cols-1 gap-4">
                {result.files.map((file, i) => (
                  <div key={i} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm overflow-hidden">
                    <div className="bg-[#111] px-4 py-2 border-b border-[#1a1a1a] flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Code2 size={14} className="text-[#00ff88]" />
                        <span className="text-[10px] font-bold text-[#737373] tracking-widest">{file.path}</span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(file.content)}
                        className="text-[8px] text-[#333] hover:text-white uppercase transition-colors"
                      >
                        Copy Source
                      </button>
                    </div>
                    <pre className="p-4 text-[9px] text-[#666] overflow-auto max-h-[200px] custom-scrollbar">
                      <code>{file.content}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#00ff8808] border border-[#00ff8822] p-8 text-center space-y-4">
              <div className="flex justify-center text-[#00ff88]">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-sm font-bold text-white uppercase tracking-widest">Full-Stack Sync Complete</h4>
              <p className="text-[10px] text-[#444] uppercase tracking-widest">
                Database tables, RLS policies, and Server Actions have been integrated into your project.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 text-[9px] text-[#00ff88] border border-[#00ff8844] px-4 py-2 hover:bg-[#00ff8811] transition-all uppercase tracking-[0.2em]"
              >
                <TerminalIcon size={12} /> Reload Editor Workspace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  FileText, 
  Puzzle, 
  Loader2, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Copy,
  Layout,
  Code2,
  Terminal as TerminalIcon,
  RefreshCw
} from "lucide-react";

import ComponentPlayground from "@/components/features/ComponentPlayground";

interface ComponentSpec {
  name: string;
  path?: string; // Add path if available
  description: string;
  props: string;
  usage: string;
}

interface DocumentationLabProps {
  projectId: string;
}

export default function DocumentationLab({ projectId }: DocumentationLabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ files: any[]; components: ComponentSpec[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"docs" | "components">("docs");
  const [selectedDoc, setSelectedTab] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/agent/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        if (data.files?.length > 0) setSelectedTab(data.files[0].path);
      } else {
        setError(data.error || "Failed to generate documentation.");
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
    <div className="flex flex-col h-full bg-[#050505] text-[#e5e5e5] font-mono overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-[#1a1a1a] bg-[#0a0a0a]">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00ff8811] border border-[#00ff8822] rounded-sm flex items-center justify-center text-[#00ff88]">
                <BookOpen size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tighter uppercase">Documentation Lab</h2>
                <p className="text-[#737373] text-[10px] uppercase tracking-widest">Automated System Documentation & Component Explorer</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="bg-[#00ff88] text-black px-6 py-3 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-[#00cc6d] transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            {result ? "Regenerate Docs" : "Generate Lab Data"}
          </button>
        </div>
      </div>

      {!result && !isLoading && !error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
          <div className="w-20 h-20 bg-[#111] border border-[#1a1a1a] rounded-full flex items-center justify-center text-[#222]">
            <FileText size={40} />
          </div>
          <div className="max-w-md space-y-4">
            <h3 className="text-sm font-bold text-[#444] uppercase tracking-widest">Documentation Pipeline Idle</h3>
            <p className="text-[11px] text-[#333] leading-relaxed uppercase">
              Initialize the pipeline to analyze your project structure. Nexus Prime will generate a README, API references, and a searchable component library.
            </p>
            <button 
              onClick={handleGenerate}
              className="text-[10px] text-[#00ff88] border border-[#00ff8833] px-4 py-2 hover:bg-[#00ff8811] transition-all uppercase tracking-widest"
            >
              Start Analysis →
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-[#00ff88]" size={32} />
          <div className="text-[10px] text-[#444] uppercase tracking-[0.3em] animate-pulse">Analyzing System Architecture...</div>
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="bg-[#ef444408] border border-[#ef444422] p-8 max-w-md w-full space-y-4 text-center">
            <AlertCircle className="mx-auto text-[#ef4444]" size={32} />
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Generation Failed</h3>
            <p className="text-[11px] text-[#737373] uppercase leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-right border-[#1a1a1a] bg-[#0a0a0a] flex flex-col overflow-auto border-r border-[#1a1a1a]">
            <div className="p-4 border-b border-[#1a1a1a]">
              <div className="flex bg-[#111] p-1 rounded-sm">
                <button 
                  onClick={() => setActiveTab("docs")}
                  className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-widest transition-all ${activeTab === "docs" ? "bg-[#1a1a1a] text-[#00ff88]" : "text-[#444] hover:text-[#666]"}`}
                >
                  Project Docs
                </button>
                <button 
                  onClick={() => setActiveTab("components")}
                  className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-widest transition-all ${activeTab === "components" ? "bg-[#1a1a1a] text-[#00ff88]" : "text-[#444] hover:text-[#666]"}`}
                >
                  Component Lab
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-2">
              {activeTab === "docs" ? (
                <div className="space-y-1">
                  {result.files.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedTab(file.path)}
                      className={`w-full text-left p-3 text-[10px] uppercase tracking-widest transition-all border border-transparent ${selectedDoc === file.path ? "bg-[#00ff8808] border-[#00ff8822] text-[#00ff88]" : "text-[#525252] hover:bg-[#111]"}`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={12} />
                        {file.path}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {result.components?.map((comp) => (
                    <button
                      key={comp.name}
                      onClick={() => setSelectedTab(comp.name)}
                      className={`w-full text-left p-3 text-[10px] uppercase tracking-widest transition-all border border-transparent ${selectedDoc === comp.name ? "bg-[#00ff8808] border-[#00ff8822] text-[#00ff88]" : "text-[#525252] hover:bg-[#111]"}`}
                    >
                      <div className="flex items-center gap-2">
                        <Puzzle size={12} />
                        {comp.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto p-10 bg-[#050505] custom-scrollbar">
            {activeTab === "docs" ? (
              <div className="max-w-3xl space-y-8 animate-in fade-in duration-500">
                {result.files.find(f => f.path === selectedDoc) && (
                  <>
                    <div className="flex justify-between items-center border-b border-[#1a1a1a] pb-4">
                      <div className="flex items-center gap-2 text-[#444]">
                        <FileText size={14} />
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">{selectedDoc}</span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(result.files.find(f => f.path === selectedDoc).content)}
                        className="text-[9px] text-[#444] hover:text-white uppercase tracking-widest"
                      >
                        Copy Markdown
                      </button>
                    </div>
                    <div className="prose prose-invert max-w-none prose-sm">
                      <pre className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 text-[#888] leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                        {result.files.find(f => f.path === selectedDoc).content}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            ) : (
          <div className="max-w-4xl space-y-12 animate-in fade-in duration-500 h-full">
            {result.components?.find(c => compMatch(c, selectedDoc)) && (
              <div className="h-full flex flex-col">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-[#00ff8811] rounded-sm flex items-center justify-center text-[#00ff88]">
                      <Puzzle size={18} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tighter uppercase text-white">{selectedDoc}</h2>
                  </div>
                  <p className="text-[11px] text-[#737373] leading-relaxed uppercase tracking-wider">
                    {result.components.find(c => compMatch(c, selectedDoc))?.description}
                  </p>
                </div>

                <div className="flex-1 min-h-0">
                  <ComponentPlayground 
                    projectId={projectId} 
                    componentPath={result.components.find(c => compMatch(c, selectedDoc))?.path || `components/${selectedDoc}.tsx`} 
                  />
                </div>
              </div>
            )}
          </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function compMatch(comp: ComponentSpec, selected: string | null) {
  return comp.name === selected;
}

function ComponentDetail({ comp, onCopy }: { comp: ComponentSpec; onCopy: (t: string) => void }) {
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00ff8811] rounded-sm flex items-center justify-center text-[#00ff88]">
            <Puzzle size={18} />
          </div>
          <h2 className="text-2xl font-bold tracking-tighter uppercase text-white">{comp.name}</h2>
        </div>
        <p className="text-[11px] text-[#737373] leading-relaxed uppercase tracking-wider max-w-2xl">
          {comp.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Props */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-[#444] uppercase tracking-[0.3em] flex items-center gap-2">
            <Layout size={12} /> Property Definitions
          </h3>
          <pre className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 text-[10px] text-[#00ff88] overflow-auto max-h-[300px] custom-scrollbar">
            <code>{comp.props}</code>
          </pre>
        </div>

        {/* Usage */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-bold text-[#444] uppercase tracking-[0.3em] flex items-center gap-2">
              <Code2 size={12} /> Implementation Example
            </h3>
            <button 
              onClick={() => onCopy(comp.usage)}
              className="text-[8px] text-[#222] hover:text-[#444] uppercase tracking-widest"
            >
              Copy Example
            </button>
          </div>
          <pre className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 text-[10px] text-[#888] overflow-auto max-h-[300px] custom-scrollbar">
            <code>{comp.usage}</code>
          </pre>
        </div>
      </div>

      {/* Visual Sandbox Metaphor */}
      <div className="bg-[#00ff8805] border border-dashed border-[#00ff8822] p-12 text-center space-y-4">
        <div className="flex justify-center text-[#00ff8844]">
          <TerminalIcon size={32} />
        </div>
        <div className="space-y-1">
          <h4 className="text-[10px] font-bold text-[#00ff88] uppercase tracking-[0.2em]">Sandbox Environment Ready</h4>
          <p className="text-[9px] text-[#333] uppercase tracking-widest">
            Visual preview is simulated. Use the implementation example above to integrate {comp.name} into your build.
          </p>
        </div>
      </div>
    </div>
  );
}

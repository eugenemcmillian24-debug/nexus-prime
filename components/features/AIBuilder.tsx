"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { NEXUS_TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/templates";
import { PREMIUM_AGENTS, TIER_LIMITS } from "@/lib/nexus_prime_constants";
import Terminal from "@/components/Terminal";
import CodePreview from "@/components/CodePreview";
import IterativeRefinement from "@/components/IterativeRefinement";
import ScreenshotUpload from "@/components/ScreenshotUpload";
import VoiceRecorder from "@/components/VoiceRecorder";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function AIBuilder({ userId, isAdmin, credits }: { userId: string; isAdmin: boolean; credits: any }) {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [templateCategory, setTemplateCategory] = useState("all");
  const [selectedAgentType, setSelectedAgentType] = useState("builder");
  const [selectedTrainingModuleId, setSelectedTrainingModuleId] = useState<string | null>(null);
  const [trainingModules, setTrainingModules] = useState<any[]>([]);

  useEffect(() => {
    const fetchModules = async () => {
      const { data } = await supabase.from('agent_training_modules').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      setTrainingModules(data || []);
    };
    fetchModules();
  }, [userId]);

  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`job-status-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agent_jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload: any) => {
          if (payload.new.status === "completed") {
            setJobResult(payload.new.result);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const tier = (credits?.tier || "Starter") as keyof typeof TIER_LIMITS;
  const tierConfig = TIER_LIMITS[tier] || TIER_LIMITS['Starter'];
  const canUsePremiumAgents = tierConfig.premiumAgents || isAdmin;
  const standardCost = tierConfig.buildCost || 10;

  const startBuild = async () => {
    if (!prompt.trim() && !imageUrl) return;
    setIsLoading(true);
    setJobResult(null);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          userId,
          imageUrl,
          agentType: selectedAgentType,
          trainingModuleId: selectedTrainingModuleId
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setJobId(data.jobId);
      } else {
        alert(data.error || "Execution failed.");
      }
    } catch (e) {
      alert("A system exception occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = templateCategory === "all"
    ? NEXUS_TEMPLATES
    : NEXUS_TEMPLATES.filter(t => t.category === templateCategory);

  if (jobId) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center text-xs uppercase tracking-widest text-[#444]">
          <span>Status: {jobResult ? "Sequence Completed" : "Orchestrating Agents..."}</span>
          <button onClick={() => { setJobId(null); setJobResult(null); }} className="hover:text-white">[ New Sequence ]</button>
        </div>
        {jobResult ? (
          <>
            <CodePreview result={jobResult?.code || jobResult || { files: [] }} jobId={jobId} userId={userId} />
            <IterativeRefinement jobId={jobId} userId={userId} currentCode={jobResult?.code || jobResult} onNewBuild={setJobResult} />
          </>
        ) : (
          <Terminal jobId={jobId} />
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 md:space-y-16 animate-in fade-in duration-700 relative z-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-[#00ff88] rounded-full shadow-[0_0_15px_rgba(0,255,136,0.5)]" />
            <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none">Autonomous Forge</h2>
          </div>
          <p className="text-[#525252] text-[10px] uppercase tracking-[0.4em] font-bold pl-5">Nexus Prime Orchestration Layer // Active</p>
        </div>
        
        <div className="flex items-center gap-4 md:gap-6 border-l border-white/5 pl-4 md:pl-6 h-12 shrink-0">
          <div className="text-right">
            <div className="text-[9px] font-bold text-[#444] uppercase tracking-widest">Active Credits</div>
            <div className="text-xl font-black text-[#00ff88] tracking-tighter">{credits?.balance || 0}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold text-[#444] uppercase tracking-widest">System Tier</div>
            <div className="text-xl font-black text-white tracking-tighter uppercase">{credits?.tier || "Starter"}</div>
          </div>
        </div>
      </header>

      {/* Templates */}
      <section className="space-y-8">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <Icons.Layers size={14} className="text-[#444]" />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Seed Blueprints</span>
          </div>
          <div className="flex gap-1 bg-white/[0.02] p-1 rounded-xl border border-white/5 overflow-x-auto max-w-[60vw] md:max-w-none">
            {TEMPLATE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setTemplateCategory(cat.id)}
                className={`text-[9px] font-black uppercase px-4 py-2 rounded-lg transition-all ${templateCategory === cat.id ? 'text-black bg-[#00ff88] shadow-lg shadow-[#00ff88]/20' : 'text-[#444] hover:text-white'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {filteredTemplates.map((template) => {
            const Icon = (Icons as any)[template.icon] || Icons.FileCode;
            const isSelected = prompt === template.prompt;
            return (
              <button
                key={template.id}
                onClick={() => setPrompt(template.prompt)}
                className={`group relative p-6 rounded-2xl border transition-all text-left overflow-hidden ${isSelected ? 'border-[#00ff8844] bg-[#00ff8805] ring-2 ring-[#00ff8811]' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10'}`}
              >
                <div className={`mb-4 transition-transform group-hover:scale-110 ${isSelected ? 'text-[#00ff88]' : 'text-[#444]'}`}>
                  <Icon size={20} />
                </div>
                <div className={`text-[11px] font-black uppercase tracking-tight leading-tight ${isSelected ? 'text-white' : 'text-[#525252]'}`}>{template.name}</div>
                {isSelected && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Command Input */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative group">
            <div className="absolute top-6 right-6 flex gap-4 z-20">
              <ScreenshotUpload onUpload={setImageUrl} />
              <VoiceRecorder onTranscription={t => setPrompt(p => p + " " + t)} />
            </div>
            
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="ENTER APPLICATION PROTOCOL OR SYSTEM DESCRIPTION..."
              className="w-full h-48 md:h-72 bg-white/[0.02] border border-white/5 rounded-[32px] p-10 text-white text-lg font-medium outline-none focus:border-[#00ff8833] focus:bg-white/[0.04] transition-all resize-none shadow-2xl placeholder:text-[#222]"
            />
            
            {/* Visual indicator for focus */}
            <div className="absolute inset-0 rounded-[32px] border border-[#00ff8800] group-focus-within:border-[#00ff8811] pointer-events-none transition-all duration-500" />
          </div>

          <button
            onClick={startBuild}
            disabled={isLoading || (credits?.balance < standardCost && !isAdmin)}
            className="w-full group bg-[#00ff88] text-black py-6 rounded-[24px] font-black uppercase tracking-[0.3em] text-sm flex items-center justify-center gap-4 hover:bg-[#00cc6d] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:grayscale transition-all shadow-[0_30px_60px_rgba(0,255,136,0.15)]"
          >
            {isLoading ? (
              <>
                <Icons.Loader2 className="animate-spin" size={20} />
                INITIALIZING SEQUENCE...
              </>
            ) : (
              <>
                <Icons.Zap size={20} className="group-hover:fill-current transition-all" />
                {credits?.balance < standardCost && !isAdmin ? "INSUFFICIENT RESOURCES" : "EXECUTE BUILD PROTOCOL"}
              </>
            )}
          </button>
        </div>

        {/* Configuration Sidebar */}
        <div className="space-y-8">
          <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 space-y-8 backdrop-blur-md">
            <div className="space-y-4">
               <div className="flex items-center gap-2">
                 <Icons.Shield size={12} className="text-[#444]" />
                 <label className="text-[10px] font-black uppercase text-white tracking-widest">Specialist Agent</label>
               </div>
               <div className="relative group/select">
                 <select
                   value={selectedAgentType}
                   onChange={(e) => setSelectedAgentType(e.target.value)}
                   className="w-full bg-[#050505] border border-white/5 rounded-2xl text-white px-5 py-4 text-xs font-bold outline-none focus:border-[#00ff8833] appearance-none cursor-pointer transition-all"
                 >
                    <option value="builder">Standard Builder ({standardCost} CR)</option>
                    {PREMIUM_AGENTS.map(agent => (
                      <option 
                        key={agent.id} 
                        value={agent.id}
                        disabled={!canUsePremiumAgents}
                      >
                        {agent.name.toUpperCase()} ({agent.cost} CR) {!canUsePremiumAgents && "[PRO]"}
                      </option>
                    ))}
                 </select>
                 <Icons.ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#444] pointer-events-none" size={14} />
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center gap-2">
                 <Icons.Cpu size={12} className="text-[#444]" />
                 <label className="text-[10px] font-black uppercase text-white tracking-widest">Training Parameters</label>
               </div>
               <div className="relative group/select">
                 <select
                   value={selectedTrainingModuleId || ""}
                   onChange={(e) => setSelectedTrainingModuleId(e.target.value || null)}
                   className="w-full bg-[#050505] border border-white/5 rounded-2xl text-white px-5 py-4 text-xs font-bold outline-none focus:border-[#00ff8833] appearance-none cursor-pointer transition-all"
                 >
                    <option value="">DEFAULT REASONING</option>
                    {trainingModules.map(m => (
                      <option key={m.id} value={m.id}>{m.name.toUpperCase()} (+5 CR)</option>
                    ))}
                 </select>
                 <Icons.ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#444] pointer-events-none" size={14} />
               </div>
            </div>

            <div className="pt-6 border-t border-white/5">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Estimated Cost</span>
                <span className="text-sm font-black text-white">{standardCost} CREDITS</span>
              </div>
              <div className="text-[9px] text-[#222] uppercase tracking-[0.2em] leading-relaxed">
                Build execution includes multi-agent design, architecting, and production-ready code generation.
              </div>
            </div>
          </div>

          {/* Quick Tip */}
          <div className="p-6 rounded-2xl bg-[#00ff8805] border border-[#00ff8811] flex gap-4 items-start">
            <Icons.Info size={16} className="text-[#00ff88] shrink-0" />
            <p className="text-[10px] text-[#00ff88] font-bold uppercase tracking-wider leading-relaxed">
              PRO TIP: UPLOAD A HAND-DRAWN SKETCH OR UI SCREENSHOT TO GIVE THE AGENTS A VISUAL ANCHOR FOR THE LAYOUT.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

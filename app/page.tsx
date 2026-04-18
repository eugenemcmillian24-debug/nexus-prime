"use client";

import { useState, useEffect } from "react";
import Terminal from "@/components/Terminal";
import CreditHistory from "@/components/CreditHistory";
import CodePreview from "@/components/CodePreview";
import VoiceRecorder from "@/components/VoiceRecorder";
import ScreenshotUpload from "@/components/ScreenshotUpload";
import ProjectHistory from "@/components/ProjectHistory";
import IterativeRefinement from "@/components/IterativeRefinement";
import LandingPage from "@/components/LandingPage";
import AgentTrainingLab from "@/components/features/AgentTrainingLab";
import AgencyWhiteLabelSettings from "@/components/features/AgencyWhiteLabelSettings";
import { createClient, User, AuthChangeEvent, Session, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { NEXUS_TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/templates";
import * as Icons from "lucide-react";
import Link from "next/link";
import { checkIsAdmin } from "@/lib/access_client";
import { PREMIUM_AGENTS } from "@/lib/nexus_prime_constants";

const supabase = (typeof window !== 'undefined' || process.env.NEXT_PUBLIC_SUPABASE_URL) ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
) : null as any;

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'build' | 'training' | 'agency' | 'history' | 'projects' | 'pricing' | 'editor'>('build');
  const [projects, setProjects] = useState<any[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string>("");
  const [authLoading, setAuthLoading] = useState(true);
  const [templateCategory, setTemplateCategory] = useState("all");
  const [selectedAgentType, setSelectedAgentType] = useState("builder");
  const [selectedTrainingModuleId, setSelectedTrainingModuleId] = useState<string | null>(null);
  const [trainingModules, setTrainingModules] = useState<any[]>([]);

  useEffect(() => {
    setIsAdmin(checkIsAdmin(user));
  }, [user]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } }: any = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthLoading(false);
    };

    checkUser();

    const { data: { subscription } }: any = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTrainingModules();
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (e) {}
  };

  const fetchTrainingModules = async () => {
    const { data } = await supabase.from('agent_training_modules').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
    setTrainingModules(data || []);
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`credits-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_credits', filter: `user_id=eq.${user.id}` }, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        setCredits(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
        async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if ((payload.new as Record<string, unknown>).status === "completed") {
            const result = (payload.new as Record<string, unknown>).result;
            setJobResult(result);
            
            // AUTO-CONVERT TO PROJECT FOR THE EDITOR
            if (result && (result as any).code?.files) {
              try {
                const res = await fetch("/api/projects", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: `Build ${jobId.slice(0, 8)}`,
                    description: prompt.slice(0, 100),
                    files: (result as any).code.files
                  })
                });
                const data = await res.json();
                if (data.project) {
                  setCurrentProjectId(data.project.id);
                  setCurrentProjectName(data.project.name);
                  setActiveTab('editor');
                }
              } catch (e) {
                console.error("Auto-project creation failed", e);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const startBuild = async () => {
    if (!prompt.trim() && !imageUrl) return;
    if (!user) return;
    setIsLoading(true);
    setJobResult(null);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt, 
          userId: user.id, 
          imageUrl, 
          agentType: selectedAgentType, 
          trainingModuleId: selectedTrainingModuleId 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setJobId(data.jobId);
      } else if (response.status === 402) {
        alert(data.error);
        setActiveTab('pricing');
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Check the console.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async (type: 'subscription' | 'topup', id: string) => {
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type, 
          tier: type === 'subscription' ? id : undefined,
          packId: type === 'topup' ? id : undefined
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Checkout failed:", err);
    }
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleLoadBuild = (build: any) => {
    if (build.id && activeTab === 'projects') {
      // It's a project (projects tab uses the projects table)
      setCurrentProjectId(build.id);
      setCurrentProjectName(build.name);
      setActiveTab('editor');
    } else if (build.result?.code) {
      // It's a job
      setJobId(build.id);
      setJobResult(build.result);
      setActiveTab('build');
    }
  };

  const handleForkBuild = (build: any) => {
    setPrompt(build.prompt || "");
    setActiveTab('build');
  };

  const handleNewBuild = (newResult: any) => {
    setJobResult(newResult);
  };

  const filteredTemplates = templateCategory === "all"
    ? NEXUS_TEMPLATES
    : NEXUS_TEMPLATES.filter(t => t.category === templateCategory);

  if (authLoading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-12 h-12 border border-dashed border-[#00ff88] rounded-full animate-spin" />
    </div>
  );

  if (!user) return <LandingPage />;

  return (
    <div className="min-h-screen bg-[#050505] text-[#888] font-mono p-4 md:p-8 selection:bg-[#00ff8822] selection:text-[#00ff88]">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center border-b border-[#1a1a1a] pb-4 gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-8 h-8 bg-[#00ff88] rounded-sm flex items-center justify-center text-black font-bold">N</div>
            <h1 className="text-xl font-bold tracking-tighter text-white uppercase tracking-widest">Nexus Prime</h1>
          </div>
          <div className="flex flex-wrap gap-3 md:gap-4 text-[9px] md:text-xs uppercase tracking-widest items-center justify-center md:justify-end">
            <button
              onClick={() => setActiveTab('editor')}
              className={`hover:text-white transition-all ${activeTab === 'editor' ? 'text-white' : 'text-[#444]'}`}
            >
              [ Editor ]
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`hover:text-white transition-all ${activeTab === 'projects' ? 'text-white' : 'text-[#444]'}`}
            >
              [ Projects ]
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`hover:text-white transition-all ${activeTab === 'history' ? 'text-white' : 'text-[#444]'}`}
            >
              [ Credits ]
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`hover:text-white transition-all ${activeTab === 'training' ? 'text-white' : 'text-[#444]'}`}
            >
              [ Training Lab ]
            </button>
            <button
              onClick={() => setActiveTab('agency')}
              className={`hover:text-indigo-400 transition-all ${activeTab === 'agency' ? 'text-indigo-400' : 'text-[#444]'}`}
            >
              [ Agency ]
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`hover:text-[#00ff88] transition-all ${activeTab === 'pricing' ? 'text-[#00ff88]' : 'text-[#444]'}`}
            >
              [ Buy Credits ]
            </button>
            <div className="text-white font-bold whitespace-nowrap">
              {isAdmin ? 'ADMIN: ∞ CR' : `${credits?.tier || 'Starter'}: ${credits?.balance || 0} CR`}
            </div>
            <button
              onClick={handleLogout}
              className="text-[#444] hover:text-[#ff4444] transition-all"
            >
              [ Logout ]
            </button>
          </div>
        </header>


        {/* Unified Dashboard Navigation */}
        {activeTab !== 'editor' && !jobId && (
          <div className="flex items-center gap-6 border-b border-[#1a1a1a] pb-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('build')}
              className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'build' ? 'text-[#00ff88]' : 'text-[#444] hover:text-white'}`}
            >
              <Icons.Zap size={14} /> AI Builder
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'editor' ? 'text-[#00ff88]' : 'text-[#444] hover:text-white'}`}
            >
              <Icons.Code2 size={14} /> Editor
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'projects' ? 'text-[#00ff88]' : 'text-[#444] hover:text-white'}`}
            >
              <Icons.FolderOpen size={14} /> Projects
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'training' ? 'text-[#00ff88]' : 'text-[#444] hover:text-white'}`}
            >
              <Icons.Brain size={14} /> Training Lab
            </button>
            <button
              onClick={() => setActiveTab('agency')}
              className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'agency' ? 'text-indigo-400' : 'text-[#444] hover:text-white'}`}
            >
              <Icons.Shield size={14} /> Agency Mode
            </button>
            <Link href="/gallery" className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-[#444] hover:text-white">
              <Icons.Image size={14} /> Gallery
            </Link>
          </div>
        )}

        {/* Editor Tab (Full Professional Suite) */}
        {activeTab === 'editor' && currentProjectId && (
          <div className="fixed inset-0 z-50 bg-[#050505]">
            <div className="absolute top-4 right-8 z-[60]">
               <button 
                 onClick={() => setActiveTab('build')}
                 className="bg-[#111] border border-[#1a1a1a] text-[#444] hover:text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm"
               >
                 Close Editor
               </button>
            </div>
            <AppLayout
              userId={user.id}
              projectId={currentProjectId}
              projectName={currentProjectName}
            />
          </div>
        )}

        {/* Tab Content Rendering */}
        {!jobId && activeTab === 'agency' && (
          <div className="bg-[#0a0a0a] border border-indigo-500/44 p-4 md:p-8 animate-in zoom-in-95 duration-300">
            <AgencyWhiteLabelSettings />
          </div>
        )}
        {!jobId && activeTab === 'training' && (
          <div className="bg-[#0a0a0a] border border-[#00ff8844] p-4 md:p-8 animate-in zoom-in-95 duration-300">
            <AgentTrainingLab />
          </div>
        )}
        {!jobId && activeTab === 'pricing' && (
          <div className="bg-[#0a0a0a] border border-[#00ff8844] p-4 md:p-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[#00ff88] text-lg font-bold tracking-widest uppercase">Monetization Hub</h2>
              <button onClick={() => setActiveTab('build')} className="text-[#444] hover:text-white">✕</button>
            </div>
            {/* ... pricing content ... */}

            <div className="space-y-8">
              {/* Subscriptions */}
              <div className="space-y-4">
                <h3 className="text-white text-xs font-bold uppercase tracking-widest border-b border-white/5 pb-2">Subscription Tiers</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { name: "Starter", price: "$9", credits: 100, desc: "Individual Builders" },
                    { name: "PRO", price: "$29", credits: 500, desc: "Power Users" },
                    { name: "Enterprise", price: "$99", credits: 2000, desc: "Scale Fast" },
                  ].map((tier) => (
                    <div key={tier.name} className="border border-[#1a1a1a] p-6 space-y-4 hover:border-[#00ff8844] transition-all group">
                      <div className="text-xs text-[#444] tracking-[0.2em]">{tier.name}</div>
                      <div className="text-2xl text-white font-bold">{tier.price}<span className="text-xs font-normal text-[#444]">/mo</span></div>
                      <div className="text-[#00ff88] text-xs font-bold">{tier.credits} CREDITS</div>
                      <div className="text-[10px] text-[#444] leading-relaxed uppercase">{tier.desc}</div>
                      <button
                        onClick={() => handleCheckout('subscription', tier.name)}
                        className="w-full bg-[#111] border border-[#1a1a1a] py-2 text-[10px] uppercase font-bold text-white group-hover:bg-[#00ff88] group-hover:text-black transition-all"
                      >
                        Select Plan
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Credit Top-ups */}
              <div className="space-y-4">
                <h3 className="text-white text-xs font-bold uppercase tracking-widest border-b border-white/5 pb-2">Credit Top-ups</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: "pack_50", price: "$5", credits: 50, desc: "Quick Build" },
                    { id: "pack_250", price: "$15", credits: 250, desc: "Most Popular" },
                    { id: "pack_1000", price: "$45", credits: 1000, desc: "Power Pack" },
                  ].map((pack) => (
                    <div key={pack.id} className="border border-[#1a1a1a] p-6 space-y-4 hover:border-[#00ff8844] transition-all group">
                      <div className="text-xs text-[#444] tracking-[0.2em]">ONE-TIME</div>
                      <div className="text-2xl text-white font-bold">{pack.price}</div>
                      <div className="text-emerald-400 text-xs font-bold">{pack.credits} CREDITS</div>
                      <div className="text-[10px] text-[#444] leading-relaxed uppercase">{pack.desc}</div>
                      <button
                        onClick={() => handleCheckout('topup', pack.id)}
                        className="w-full bg-[#111] border border-[#1a1a1a] py-2 text-[10px] uppercase font-bold text-white group-hover:bg-emerald-500 group-hover:text-black transition-all"
                      >
                        Buy Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Premium Agents */}
              <div className="space-y-4">
                <h3 className="text-white text-xs font-bold uppercase tracking-widest border-b border-white/5 pb-2">Premium Agent Access</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PREMIUM_AGENTS.map((agent) => (
                    <div key={agent.id} className="border border-[#1a1a1a] p-6 space-y-3 bg-[#050505] relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Icons.Zap size={40} />
                      </div>
                      <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Specialist</div>
                      <div className="text-sm font-bold text-white leading-tight">{agent.name}</div>
                      <p className="text-[9px] text-[#444] leading-relaxed">{agent.description}</p>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[10px] font-mono text-[#666]">{agent.cost} CR / run</span>
                        <button className="text-[9px] font-bold text-emerald-500 hover:underline">ACTIVATE</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}



        {/* Credit History Section */}
        {!jobId && activeTab === 'history' && (
          <div className="animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-xs font-bold tracking-[0.3em] uppercase">Transaction Sequence</h2>
              <button onClick={() => setActiveTab('build')} className="text-[#444] hover:text-white">✕</button>
            </div>
            <CreditHistory userId={user.id} />
          </div>
        )}

        {/* Project History */}
        {!jobId && activeTab === 'projects' && (
          <div className="animate-in zoom-in-95 duration-300 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-white text-xs font-bold tracking-[0.3em] uppercase">Persistent Sequences</h2>
              <button onClick={() => setActiveTab('build')} className="text-[#444] hover:text-white">✕</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.length === 0 ? (
                <div className="col-span-full py-20 text-center border border-dashed border-[#1a1a1a] text-[#333] uppercase text-[10px] tracking-widest">
                  No active projects detected. Execute a build sequence to start.
                </div>
              ) : (
                projects.map((project) => (
                  <div 
                    key={project.id}
                    onClick={() => handleLoadBuild(project)}
                    className="group bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#00ff8844] p-6 transition-all cursor-pointer space-y-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:text-[#00ff88] group-hover:opacity-30 transition-all">
                      <Icons.Code2 size={40} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-[#444] uppercase tracking-widest font-bold group-hover:text-[#00ff88] transition-colors">{project.name}</div>
                      <p className="text-[9px] text-[#222] line-clamp-2 uppercase tracking-tighter leading-relaxed">
                        {project.description || "NO DESCRIPTION LOGGED"}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-white/5 text-[8px] text-[#222] uppercase tracking-widest">
                      <span>SYNCED: {new Date(project.updated_at).toLocaleDateString()}</span>
                      <span className="text-[#444]">V{project.current_version || 1}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Input Section */}
        {!jobId && activeTab === 'build' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
        {/* Templates Section (Feature 3 - Enhanced) */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="text-xs uppercase tracking-widest text-[#444]">Seed Templates</div>
            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-1">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setTemplateCategory(cat.id)}
                  className={`px-2 py-1 text-[9px] uppercase tracking-wider rounded-sm transition-colors ${
                    templateCategory === cat.id
                      ? "bg-[#00ff88]/10 text-[#00ff88]"
                      : "text-[#333] hover:text-[#666]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredTemplates.map((template) => {
                  const Icon = (Icons as any)[template.icon] || Icons.FileCode;
                  return (
                    <button
                      key={template.id}
                      onClick={() => setPrompt(template.prompt)}
                      className="group border border-[#1a1a1a] p-4 text-left space-y-2 hover:border-[#00ff8844] transition-all"
                    >
                      <div className="flex justify-between items-center text-[#444] group-hover:text-[#00ff88] transition-colors">
                        <Icon size={16} />
                        <Icons.Plus size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[10px] text-white font-bold uppercase tracking-widest">{template.name}</div>
                      <div className="text-[8px] text-[#333] leading-relaxed uppercase">{template.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-xs uppercase tracking-widest text-[#444]">Agent Configuration</div>
                <div className="flex gap-4">
                  <select 
                    value={selectedAgentType} 
                    onChange={(e) => setSelectedAgentType(e.target.value)}
                    className="bg-[#111] border border-[#1a1a1a] text-[9px] uppercase tracking-widest text-white px-3 py-1 outline-none focus:border-[#00ff88]/50"
                  >
                    <option value="builder">Standard Builder (Base Cost)</option>
                    {PREMIUM_AGENTS.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name} ({agent.cost} CR)</option>
                    ))}
                  </select>

                  <select 
                    value={selectedTrainingModuleId || ""} 
                    onChange={(e) => setSelectedTrainingModuleId(e.target.value || null)}
                    className="bg-[#111] border border-[#1a1a1a] text-[9px] uppercase tracking-widest text-white px-3 py-1 outline-none focus:border-[#00ff88]/50"
                  >
                    <option value="">Default Training</option>
                    {trainingModules.map(module => (
                      <option key={module.id} value={module.id}>{module.name} (+5 CR)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div className="text-xs uppercase tracking-widest text-[#444]">System Prompt Input</div>
                <div className="flex items-center gap-4">
                  <ScreenshotUpload onUpload={setImageUrl} />
                  <VoiceRecorder onTranscription={(text) => setPrompt((prev) => prev + (prev ? " " : "") + text)} />
                </div>
              </div>
              <div className="relative group">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      startBuild();
                    }
                  }}
                  placeholder="Describe the application you want to build..."
                  className="w-full h-40 bg-[#0a0a0a] border border-[#1a1a1a] p-6 text-white outline-none focus:border-[#00ff88] transition-colors resize-none custom-scrollbar placeholder:text-[#333]"
                />
                <div className="absolute inset-0 border border-[#00ff8800] group-focus-within:border-[#00ff8822] pointer-events-none transition-all" />
              </div>
              
              <button
                onClick={startBuild}
                disabled={isLoading}
                className="w-full bg-[#00ff88] text-black py-4 font-bold uppercase tracking-tighter hover:bg-[#00cc6d] active:scale-[0.99] transition-all disabled:opacity-50 disabled:grayscale"
              >
                {isLoading ? "Initializing..." : "Execute Build Sequence (10 Credits)"}
              </button>
            </div>
          </div>
        ) : jobId && (
          /* Execution Section */
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center text-xs uppercase tracking-widest text-[#444]">
              <span>Job Status: {jobResult ? "Completed" : "Active Execution"}</span>
              <button 
                onClick={() => { setJobId(null); setJobResult(null); }} 
                className="hover:text-white transition-colors"
              >
                [ New Job ]
              </button>
            </div>
            {jobResult ? (
              <>
                <CodePreview result={jobResult?.code || jobResult || { files: [] }} jobId={jobId} userId={user.id} />
                {/* Feature 4: Iterative Refinement */}
                <IterativeRefinement
                  jobId={jobId}
                  userId={user.id}
                  currentCode={jobResult?.code || jobResult}
                  onNewBuild={handleNewBuild}
                />
              </>
            ) : (
              <Terminal jobId={jobId} />
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="pt-8 border-t border-[#1a1a1a] text-[10px] uppercase tracking-[0.2em] text-[#333] flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            <span>{credits?.agency_mode && credits?.agency_config?.company_name ? credits.agency_config.company_name : 'Multi-Agent AI Builder System'}</span>
            <span className="text-[#111]">UID: {user.id.slice(0, 8)}...</span>
          </div>
          <span>© 2026 {credits?.agency_mode && credits?.agency_config?.company_name ? credits.agency_config.company_name.toUpperCase() : 'NEXUS PRIME CORP'}</span>
        </footer>
      </div>
    </div>
  );
}

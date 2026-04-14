"use client";

import { useState, useEffect } from "react";
import Terminal from "@/components/Terminal";
import CreditHistory from "@/components/CreditHistory";
import CodePreview from "@/components/CodePreview";
import VoiceRecorder from "@/components/VoiceRecorder";
import ScreenshotUpload from "@/components/ScreenshotUpload";
import Login from "@/components/Login";
import { createClient, User } from "@supabase/supabase-js";
import { NEXUS_TEMPLATES } from "@/lib/templates";
import * as Icons from "lucide-react";

const supabase = (typeof window !== 'undefined' || process.env.NEXT_PUBLIC_SUPABASE_URL) ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
) : null as any;

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Auth Check
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthLoading(false);
    };

    checkUser();

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // 3. Fetch Profile & Credits
    const fetchUserData = async () => {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const { data: creditData } = await supabase.from('user_credits').select('*').eq('user_id', user.id).single();
      setProfile(profileData);
      setCredits(creditData);
    };

    fetchUserData();

    // 4. Realtime Credits Subscription
    const channel = supabase
      .channel(`credits-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_credits', filter: `user_id=eq.${user.id}` }, (payload) => {
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
        (payload) => {
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

  const startBuild = async () => {
    if (!prompt.trim() && !imageUrl) return;
    if (!user) return;
    setIsLoading(true);
    setJobResult(null);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, userId: user.id, imageUrl }),
      });

      const data = await response.json();

      if (response.ok) {
        setJobId(data.jobId);
      } else if (response.status === 402) {
        alert(data.error);
        setShowPricing(true);
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

  const handleCheckout = async (tier: string) => {
    if (!user) return;
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, tier }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
      alert("Failed to initiate checkout.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-12 h-12 border border-dashed border-[#00ff88] rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-[#050505] text-[#888] font-mono p-8 selection:bg-[#00ff8822] selection:text-[#00ff88]">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex justify-between items-center border-b border-[#1a1a1a] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00ff88] rounded-sm flex items-center justify-center text-black font-bold">N</div>
            <h1 className="text-xl font-bold tracking-tighter text-white uppercase tracking-widest">Nexus Prime</h1>
          </div>
          <div className="flex gap-6 text-xs uppercase tracking-widest items-center">
            <button 
              onClick={() => { setShowHistory(!showHistory); setShowPricing(false); }} 
              className={`hover:text-white transition-all ${showHistory ? 'text-white' : 'text-[#444]'}`}
            >
              [ History ]
            </button>
            <button 
              onClick={() => { setShowPricing(!showPricing); setShowHistory(false); }} 
              className="text-[#00ff88] hover:underline transition-all"
            >
              [ Buy Credits ]
            </button>
            <div className="text-white font-bold">
              {credits?.tier || 'Starter'}: {credits?.balance || 0} CR
            </div>
            <button 
              onClick={handleLogout}
              className="text-[#444] hover:text-[#ff4444] transition-all"
            >
              [ Logout ]
            </button>
          </div>
        </header>

        {/* Pricing Section Overlay */}
        {showPricing && (
          <div className="bg-[#0a0a0a] border border-[#00ff8844] p-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[#00ff88] text-lg font-bold tracking-widest uppercase">Select Tier</h2>
              <button onClick={() => setShowPricing(false)} className="text-[#444] hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
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
                    onClick={() => handleCheckout(tier.name)}
                    className="w-full bg-[#111] border border-[#1a1a1a] py-2 text-[10px] uppercase font-bold text-white group-hover:bg-[#00ff88] group-hover:text-black transition-all"
                  >
                    Select Plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credit History Section Overlay */}
        {showHistory && (
          <div className="animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-xs font-bold tracking-[0.3em] uppercase">Transaction Sequence</h2>
              <button onClick={() => setShowHistory(false)} className="text-[#444] hover:text-white">✕</button>
            </div>
            <CreditHistory userId={user.id} />
          </div>
        )}

        {/* Input Section */}
        {!jobId && !showPricing && !showHistory ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Templates Section */}
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-widest text-[#444]">Seed Templates</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {NEXUS_TEMPLATES.map((template) => {
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
              <CodePreview result={jobResult.code} jobId={jobId} userId={user.id} />
            ) : (
              <Terminal jobId={jobId} />
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="pt-8 border-t border-[#1a1a1a] text-[10px] uppercase tracking-[0.2em] text-[#333] flex justify-between">
          <div className="flex gap-4">
            <span>Multi-Agent AI Builder System</span>
            <span className="text-[#111]">UID: {user.id.slice(0, 8)}...</span>
          </div>
          <span>© 2026 NEXUS PRIME CORP</span>
        </footer>
      </div>
    </div>
  );
}

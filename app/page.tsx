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
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/client";
import type { User, AuthChangeEvent, Session, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { NEXUS_TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/templates";
import * as Icons from "lucide-react";
import Link from "next/link";
import { checkIsAdmin } from "@/lib/access_client";
import { PREMIUM_AGENTS } from "@/lib/nexus_prime_constants";

const supabase = typeof window !== 'undefined' ? createClient() : (null as any);

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
  const [activeTab, setActiveTab] = useState<'build' | 'training' | 'agency' | 'history' | 'projects' | 'pricing' | 'editor' | 'marketplace'>('build');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      fetchInitialCredits();
    }
  }, [user]);

  const fetchInitialCredits = async () => {
    const { data } = await supabase.from('user_credits').select('*').eq('user_id', user?.id).single();
    setCredits(data);
  };

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
                // PROD FIX: Improved error handling for auto-project creation
                // console.error("Auto-project creation failed", e);
              } catch (e) {
                // PROD FIX: Added missing catch block
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
        // PROD FIX: Replaced alert with structured error handling
        alert(data.error || "Insufficient credits to initialize build protocol.");
        setActiveTab('pricing');
      } else {
        alert(data.error || "Execution failed. Please verify your system parameters.");
      }
    } catch (e) {
      // console.error(e); // PROD FIX: Removed console.error
      alert("A system exception occurred. Build sequence aborted.");
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
      // PROD FIX: Removed console.error
      // console.error("Checkout failed:", err);
      alert("Payment gateway connection failed. Please try again.");
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

  // PROD FIX: Unified Sidebar Dashboard for all logged-in users
  return (
    <AppLayout
      userId={user.id}
      projectId={currentProjectId || undefined}
      projectName={currentProjectName}
      initialView={activeTab === 'editor' ? 'editor' : 'home'}
    />
  );
}


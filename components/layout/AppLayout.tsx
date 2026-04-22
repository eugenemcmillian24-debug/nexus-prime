"use client";

import React, { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { checkIsAdmin } from "@/lib/access_client";
import { createClient } from "@supabase/supabase-js";

const supabase = (() => {
  if (typeof window === 'undefined') return null as any;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null as any;
  return createClient(url, key);
})();

// Lazy-load all feature components for code splitting
const PromptTemplates = dynamic(() => import("@/components/features/PromptTemplates"), { ssr: false });
const ModelSelector = dynamic(() => import("@/components/features/ModelSelector"), { ssr: false });
const UsageAnalytics = dynamic(() => import("@/components/features/UsageAnalytics"), { ssr: false });
const ComponentLibrary = dynamic(() => import("@/components/features/ComponentLibrary"), { ssr: false });
const CommandPalette = dynamic(() => import("@/components/features/CommandPalette"), { ssr: false });
const FileExplorer = dynamic(() => import("@/components/features/FileExplorer"), { ssr: false });
const MultiFileEditor = dynamic(() => import("@/components/features/MultiFileEditor"), { ssr: false });
const VersionControl = dynamic(() => import("@/components/features/VersionControl"), { ssr: false });
const AICodeReview = dynamic(() => import("@/components/features/AICodeReview"), { ssr: false });
const DeploymentPipeline = dynamic(() => import("@/components/features/DeploymentPipeline"), { ssr: false });
const TeamWorkspace = dynamic(() => import("@/components/features/TeamWorkspace"), { ssr: false });
const PromptHistory = dynamic(() => import("@/components/features/PromptHistory"), { ssr: false });
const NotificationCenter = dynamic(() => import("@/components/features/NotificationCenter"), { ssr: false });
const ProjectSettings = dynamic(() => import("@/components/features/ProjectSettings"), { ssr: false });
const RealtimeCollab = dynamic(() => import("@/components/features/RealtimeCollab"), { ssr: false });
const ApiKeyManager = dynamic(() => import("@/components/features/ApiKeyManager"), { ssr: false });
const TemplateMarketplace = dynamic(() => import("@/components/features/TemplateMarketplace"), { ssr: false });
const ContextAwareSuggestions = dynamic(() => import("@/components/features/ContextAwareSuggestions"), { ssr: false });
const CustomDomains = dynamic(() => import("@/components/features/CustomDomains"), { ssr: false });
const WebhooksApiAccess = dynamic(() => import("@/components/features/WebhooksApiAccess"), { ssr: false });
const MultiPlatformExport = dynamic(() => import("@/components/features/MultiPlatformExport"), { ssr: false });
const FigmaImport = dynamic(() => import("@/components/features/FigmaImport"), { ssr: false });
const WarRoom = dynamic(() => import("@/components/features/WarRoom"), { ssr: false });
const DatabaseArchitect = dynamic(() => import("@/components/features/DatabaseArchitect"), { ssr: false });
const DocumentationLab = dynamic(() => import("@/components/features/DocumentationLab"), { ssr: false });
const VoiceStreamOverlay = dynamic(() => import("@/components/features/VoiceStreamOverlay"), { ssr: false });
const SecurityShield = dynamic(() => import("@/components/features/SecurityShield"), { ssr: false });
const TestGenerator = dynamic(() => import("@/components/features/TestGenerator"), { ssr: false });
const PerformanceMonitor = dynamic(() => import("@/components/features/PerformanceMonitor"), { ssr: false });
const AdminControlPanel = dynamic(() => import("@/components/features/AdminControlPanel"), { ssr: false });
const DeploymentCommandCenter = dynamic(() => import("@/components/features/DeploymentCommandCenter"), { ssr: false });
const MobileEmulator = dynamic(() => import("@/components/features/MobileEmulator"), { ssr: false });
const CommunityTemplates = dynamic(() => import("@/components/features/CommunityTemplates"), { ssr: false });
const ProjectHub = dynamic(() => import("@/components/features/ProjectHub"), { ssr: false });
const AgentTrainingLab = dynamic(() => import("@/components/features/AgentTrainingLab"), { ssr: false });
const AgencyWhiteLabelSettings = dynamic(() => import("@/components/features/AgencyWhiteLabelSettings"), { ssr: false });
const CreditHistory = dynamic(() => import("@/components/CreditHistory"), { ssr: false });
const AIBuilder = dynamic(() => import("@/components/features/AIBuilder"), { ssr: false });

interface NavItem {
  id: string;
  label: string;
  icon: string;
  section: "build" | "ai" | "platform";
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  // Build
  { id: "home", label: "Project Hub", icon: "🏠", section: "build" },
  { id: "builder", label: "AI Builder", icon: "⚡", section: "build", badge: "HOT" },
  { id: "files", label: "Files", icon: "📁", section: "build" },
  { id: "editor", label: "Editor", icon: "✏️", section: "build" },
  { id: "versions", label: "Versions", icon: "📸", section: "build" },
  { id: "deploy", label: "Deploy", icon: "🚀", section: "build" },
  { id: "deploy-center", label: "Deployment Center", icon: "📊", section: "build", badge: "NEW" },
  { id: "mobile-lab", label: "Mobile Emulator", icon: "📱", section: "build", badge: "NEW" },
  { id: "database", label: "Database", icon: "🗄️", section: "build", badge: "BETA" },
  { id: "docs", label: "Documentation", icon: "📚", section: "build" },
  // AI
  { id: "templates", label: "Templates", icon: "📋", section: "ai" },
  { id: "models", label: "Models", icon: "🧠", section: "ai" },
  { id: "training", label: "Training Lab", icon: "🧠", section: "ai", badge: "NEW" },
  { id: "review", label: "Code Review", icon: "🔍", section: "ai" },
  { id: "history", label: "Prompt History", icon: "📜", section: "ai" },
  { id: "suggestions", label: "AI Suggestions", icon: "🧠", section: "ai" },
  { id: "marketplace", label: "Marketplace", icon: "🏪", section: "ai" },
  { id: "community", label: "Community Blueprints", icon: "🌍", section: "ai", badge: "NEW" },
  { id: "war-room", label: "War Room", icon: "⚔️", section: "ai", badge: "LIVE" },
  { id: "security", label: "Security Shield", icon: "🛡️", section: "ai", badge: "NEW" },
  { id: "tests", label: "AI Test Lab", icon: "🧪", section: "ai", badge: "NEW" },
  { id: "performance", label: "Performance", icon: "⚡", section: "ai", badge: "NEW" },
  { id: "figma", label: "Figma Sync", icon: "🎨", section: "ai", badge: "NEW" },
  { id: "components", label: "Components", icon: "🧩", section: "ai" },
  // Platform
  { id: "analytics", label: "Analytics", icon: "📊", section: "platform" },
  { id: "billing", label: "Credits & Billing", icon: "💰", section: "platform" },
  { id: "team", label: "Team", icon: "👥", section: "platform" },
  { id: "domains", label: "Domains", icon: "🌐", section: "platform" },
  { id: "webhooks", label: "Webhooks & API", icon: "🔌", section: "platform" },
  { id: "export", label: "Cloud Export Engine", icon: "📤", section: "platform", badge: "NEW" },
  { id: "keys", label: "API Keys", icon: "🔑", section: "platform" },
  { id: "notifications", label: "Notifications", icon: "🔔", section: "platform" },
  { id: "agency", label: "Agency Mode", icon: "🛡️", section: "platform", badge: "PRO" },
  { id: "settings", label: "Settings", icon: "⚙️", section: "platform" },
  { id: "admin", label: "System Admin", icon: "🛠️", section: "platform", badge: "ROOT" },
];

const SECTION_LABELS: Record<string, string> = {
  build: "BUILD",
  ai: "AI TOOLS",
  platform: "PLATFORM",
};

interface AppFile {
  id: string;
  path: string;
  content: string;
  language: string;
}

interface AppLayoutProps {
  userId: string;
  projectId?: string;
  projectName?: string;
  initialVersion?: number;
  initialView?: string;
}

export default function AppLayout({ userId, projectId, projectName = "Global Console", initialVersion = 1, initialView = "home" }: AppLayoutProps) {
  const [activeView, setActiveView] = useState(initialView);
  const [credits, setCredits] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeFiles, setActiveFiles] = useState<AppFile[]>([]);
  const [currentFile, setCurrentFile] = useState<AppFile | null>(null);
  const [rightPanel, setRightPanel] = useState<"none" | "review" | "versions" | "deploy" | "collab" | "war-room" | "security" | "tests" | "performance">("none");
  const [currentVersion, setCurrentVersion] = useState(initialVersion);
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const admin = checkIsAdmin(session?.user || null);
      setIsAdmin(admin);
      setUserEmail(session?.user?.email || null);
      
      if (session?.user) {
        const { data } = await supabase.from('user_credits').select('*').eq('user_id', session.user.id).single();
        setCredits(data);
      }
    };
    checkUser();

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarCollapsed(true);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Global "V" hotkey for voice command
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "v" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        setShowVoiceOverlay(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleFileSelect = useCallback((file: AppFile) => {
    setCurrentFile(file);
    if (!activeFiles.find((f) => f.id === file.id)) {
      setActiveFiles((prev) => [...prev, file]);
    }
    setActiveView("editor");
  }, [activeFiles]);

  const handleFileClose = useCallback((fileId: string) => {
    setActiveFiles((prev) => {
      const next = prev.filter((f) => f.id !== fileId);
      if (currentFile?.id === fileId) {
        setCurrentFile(next[next.length - 1] || null);
      }
      return next;
    });
  }, [currentFile]);

  const toggleRightPanel = (panel: "review" | "versions" | "deploy" | "collab" | "war-room" | "security" | "tests" | "performance") => {
    setRightPanel((prev) => (prev === panel ? "none" : panel));
  };

  const renderActiveView = () => {
    // Project-dependent views guard
    const projectViews = ["files", "editor", "versions", "deploy", "deploy-center", "database", "docs", "review", "history", "suggestions", "security", "tests", "performance", "figma", "war-room", "mobile-lab"];
    if (projectViews.includes(activeView) && !projectId) {
      return <EmptyState icon="📁" title="Project Context Required" message="Select a project from the Hub to access build tools." />;
    }

    switch (activeView) {
      case "home":
        return <ProjectHub />;
      case "builder":
        return <AIBuilder userId={userId} isAdmin={isAdmin} credits={credits} />;
      case "files":
        return (
          <FileExplorer
            projectId={projectId!}
            onFileSelect={(file: { id: string; path: string; content: string; language: string }) => handleFileSelect(file)}
          />
        );
      case "deploy-center":
        return <DeploymentCommandCenter projectId={projectId!} />;
      case "mobile-lab":
        return <MobileEmulator previewUrl="https://nexus-prime-preview.vercel.app" />;
      case "community":
        // PROD FIX: Replaced alert with structured message
        return <CommunityTemplates onFork={(template) => { /* Logic here */ }} />;
      case "editor":
        return (
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <MultiFileEditor
                projectId={projectId!}
                userId={userId}
              />
            </div>

            {/* Right split panel */}
            {rightPanel !== "none" && (
              <div style={{
                width: isMobile ? "100%" : "420px", 
                borderLeft: isMobile ? "none" : "1px solid #262626",
                display: "flex", flexDirection: "column", overflow: "hidden",
                position: isMobile ? "absolute" : "relative",
                top: 0, right: 0, bottom: 0,
                background: "#0a0a0a",
                zIndex: 50,
              }}>
                {isMobile && (
                  <div style={{ padding: "10px", borderBottom: "1px solid #262626", display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={() => setRightPanel("none")} style={{ background: "transparent", border: "none", color: "#fff" }}>CLOSE</button>
                  </div>
                )}
                {rightPanel === "review" && currentFile && (
                  <AICodeReview
                    projectId={projectId!}
                    fileId={currentFile.id!}
                    filePath={currentFile.path}
                    code={currentFile.content}
                    language={currentFile.language!}
                    onApplySuggestion={(finding) => {
                      if (finding.suggestion && currentFile) {
                        const updated = currentFile.content.replace(
                          finding.code || "",
                          finding.suggestion
                        );
                        setCurrentFile({ ...currentFile, content: updated });
                        setActiveFiles((prev) =>
                          prev.map((f) =>
                            f.id === currentFile.id ? { ...f, content: updated } : f
                          )
                        );
                      }
                    }}
                  />
                )}
                {rightPanel === "versions" && (
                  <VersionControl
                    projectId={projectId!}
                    userId={userId}
                    onRollback={async (version: number) => {
                      try {
                        const res = await fetch("/api/versions", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ project_id: projectId!, version_number: version }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setCurrentVersion(data.new_version);
                          // Refresh files if needed, or just reload page
                          window.location.reload();
                        }
                      } catch (err) {
                        // PROD FIX: Removed console.error for production
                        // console.error("Rollback failed:", err);
                      }
                    }}
                  />
                )}
                {rightPanel === "deploy" && (
                  <DeploymentPipeline
                    projectId={projectId!}
                    projectName={projectName!}
                    currentVersion={currentVersion}
                  />
                )}
                {rightPanel === "collab" && (
                  <RealtimeCollab
                    projectId={projectId!}
                    userId={userId}
                    userName={projectName!.split(' ')[0] || "User"}
                    currentFile={currentFile?.path}
                  />
                )}
                {rightPanel === "war-room" && (

                  <WarRoom
                    projectId={projectId!}
                  />
                )}
                {rightPanel === "security" && (
                  <SecurityShield
                    projectId={projectId!}
                    onFixApplied={(filePath, newCode) => {
                      if (currentFile?.path === filePath) {
                        const updated = { ...currentFile, content: newCode };
                        setCurrentFile(updated);
                        setActiveFiles((prev) =>
                          prev.map((f) => (f.id === currentFile.id ? updated : f))
                        );
                      }
                    }}
                  />
                )}
                {rightPanel === "tests" && (
                  <TestGenerator projectId={projectId!} />
                )}
                {rightPanel === "performance" && (
                  <PerformanceMonitor projectId={projectId!} />
                )}

              </div>
            )}
          </div>
        );
      case "versions":
        return (
          <VersionControl
            projectId={projectId!}
            userId={userId}
            onRollback={async (version: number) => {
              try {
                const res = await fetch("/api/versions", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ project_id: projectId, version_number: version }),
                });
                if (res.ok) {
                  const data = await res.json();
                  setCurrentVersion(data.new_version);
                  window.location.reload();
                }
              } catch (err) {
                // PROD FIX: Removed console.error for production
                // console.error("Rollback failed:", err);
              }
            }}
          />
        );
      case "deploy":
        return (
          <DeploymentPipeline
            projectId={projectId!}
            projectName={projectName!}
            currentVersion={currentVersion}
          />
        );
      case "database":
        return <DatabaseArchitect projectId={projectId!} />;
      case "docs":
        return <DocumentationLab projectId={projectId!} />;
      case "settings":
        return <ProjectSettings projectId={projectId!} />;
      case "templates":
        return <PromptTemplates />;
      case "models":
        return <ModelSelector />;
      case "review":
        return currentFile ? (
          <AICodeReview
            projectId={projectId!}
            fileId={currentFile.id}
            filePath={currentFile.path}
            code={currentFile.content}
            language={currentFile.language}
          />
        ) : (
          <EmptyState icon="🔍" title="No file selected" message="Open a file to run AI code review" />
        );
      case "components":
        return <ComponentLibrary />;
      case "analytics":
        return <UsageAnalytics />;
      case "team":
        return <TeamWorkspace userId={userId} />;
      case "history":
        return <PromptHistory projectId={projectId!} onReplayPrompt={(prompt, model) => { setActiveView("editor"); }} />;
      case "marketplace":
        return <TemplateMarketplace userId={userId} />;
      case "war-room":
        return <WarRoom projectId={projectId!} />;
      case "security":
        return <SecurityShield projectId={projectId!} />;
      case "tests":
        return <TestGenerator projectId={projectId!} />;
      case "performance":
        return <PerformanceMonitor projectId={projectId!} />;
      case "figma":
        return <FigmaImport projectId={projectId!} onImportComplete={() => setActiveView("editor")} />;
      case "suggestions":
        return <ContextAwareSuggestions projectId={projectId!} currentFile={currentFile?.path} />;
      case "domains":
        return <CustomDomains projectId={projectId!} projectName={projectName!} />;
      case "webhooks":
        return <WebhooksApiAccess projectId={projectId!} />;
      case "export":
        return <MultiPlatformExport projectId={projectId!} projectName={projectName!} />;
      case "notifications":
        return <NotificationCenter userId={userId} />;

      case "keys":
        return <ApiKeyManager userId={userId} />;
      case "training":
        return <AgentTrainingLab />;
      case "agency":
        return <AgencyWhiteLabelSettings />;
      case "billing":
        return (
          <div className="p-8 max-w-4xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Billing & Credits</h2>
            <CreditHistory userId={userId} />
            <div className="pt-8 border-t border-[#1a1a1a]">
               <button 
                 onClick={() => setActiveView('home')} // Or redirect to pricing
                 className="bg-[#00ff88] text-black px-6 py-2 text-[10px] font-bold uppercase tracking-widest"
               >
                 Purchase More Credits
               </button>
            </div>
          </div>
        );
      case "admin":
        return <AdminControlPanel />;
      default:
        return <EmptyState icon="🚀" title="Nexus Prime" message="Select a tool from the sidebar" />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a0a", color: "#e5e5e5", overflow: "hidden" }}>
      {/* Command Palette (global) */}
      <CommandPalette />

      {/* Voice Stream Overlay (global) */}
      {showVoiceOverlay && (
        <VoiceStreamOverlay
          projectId={projectId!}
          currentFile={currentFile ? { path: currentFile.path, content: currentFile.content } : null}
          onCodeApplied={(newCode) => {
            if (currentFile) {
              const updated = { ...currentFile, content: newCode };
              setCurrentFile(updated);
              setActiveFiles(prev => prev.map(f => f.id === currentFile.id ? updated : f));
            }
          }}
          onClose={() => setShowVoiceOverlay(false)}
        />
      )}


      {/* Sidebar Mobile Backdrop */}
      {isMobile && !sidebarCollapsed && (
        <div 
          onClick={() => setSidebarCollapsed(true)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)", zIndex: 90,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: sidebarCollapsed ? (isMobile ? "0px" : "72px") : "240px",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          display: "flex", flexDirection: "column",
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden", flexShrink: 0,
          position: isMobile && !sidebarCollapsed ? "absolute" : "relative",
          zIndex: 100,
          height: "100%",
          background: "rgba(10,10,10,0.8)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Logo */}
        <div style={{
          padding: sidebarCollapsed ? "24px 0" : "24px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: sidebarCollapsed ? "center" : "space-between",
        }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
            <div style={{
              width: "32px", height: "32px", background: "#00ff88", borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#000", fontWeight: "900", fontSize: "16px",
              boxShadow: "0 0 15px rgba(0,255,136,0.2)"
            }}>N</div>
            {!sidebarCollapsed && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "14px", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", textTransform: "uppercase" }}>
                  Nexus Prime
                </span>
                <span style={{ fontSize: "8px", fontWeight: 700, color: "#00ff88", letterSpacing: "0.2em" }}>SYSTEM v2.4</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="custom-scrollbar" style={{ flex: 1, overflow: "auto", padding: "16px 12px" }}>
          {(["build", "ai", "platform"] as const).map((section) => (
            <div key={section} style={{ marginBottom: "24px" }}>
              {!sidebarCollapsed && (
                <div style={{
                  padding: "0 12px 8px 12px", fontSize: "9px", fontWeight: 900,
                  color: "#444", letterSpacing: "0.2em", textTransform: "uppercase"
                }}>
                  {SECTION_LABELS[section]}
                </div>
              )}
              {NAV_ITEMS.filter((item) => {
                if (item.id === "admin") return isAdmin;
                
                // Tier-based visibility logic
                const tier = credits?.tier?.toUpperCase() || "STARTER";
                const isAgency = tier === "AGENCY" || tier === "ENTERPRISE" || isAdmin;
                const isPro = tier === "PRO" || isAgency;

                if (item.id === "agency") return isAgency;
                
                // Hide advanced platform features from Starter users to encourage upgrade
                const proFeatures = ["analytics", "team", "domains", "webhooks", "export", "keys"];
                if (proFeatures.includes(item.id)) return isPro;

                return item.section === section;
              }).map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    style={{
                      width: "100%",
                      padding: sidebarCollapsed ? "12px 0" : "10px 12px",
                      borderRadius: "12px",
                      border: "none",
                      background: isActive ? "rgba(255,255,255,0.03)" : "transparent",
                      color: isActive ? "#00ff88" : "#525252",
                      cursor: "pointer", fontSize: "13px", fontWeight: isActive ? 700 : 500,
                      display: "flex", alignItems: "center",
                      justifyContent: sidebarCollapsed ? "center" : "flex-start",
                      gap: "12px", marginBottom: "4px",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                    }}
                  >
                    {isActive && !sidebarCollapsed && (
                      <div style={{
                        position: "absolute", left: "-12px", top: "10px", bottom: "10px",
                        width: "3px", background: "#00ff88", borderRadius: "0 4px 4px 0",
                        boxShadow: "0 0 10px rgba(0,255,136,0.5)"
                      }} />
                    )}
                    <span style={{ fontSize: "18px", opacity: isActive ? 1 : 0.5 }}>{item.icon}</span>
                    {!sidebarCollapsed && <span style={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "11px" }}>{item.label}</span>}
                    {!sidebarCollapsed && item.badge && (
                      <span style={{
                        marginLeft: "auto", padding: "2px 6px", borderRadius: "6px",
                        fontSize: "8px", fontWeight: 900, background: item.badge === "PRO" ? "#8b5cf6" : "#00ff88", color: "#000",
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom: Kbd shortcut hint */}
        {!sidebarCollapsed && (
          <div style={{
            padding: "12px 16px", borderTop: "1px solid #262626",
            fontSize: "11px", color: "#525252", textAlign: "center",
          }}>
            <kbd style={{ padding: "2px 6px", borderRadius: "4px", background: "#171717", border: "1px solid #262626" }}>⌘K</kbd>
            {" "}Command Palette
          </div>
        )}
      </aside>

      {/* Main content area */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top toolbar */}
        <header style={{
          height: "64px", borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", flexShrink: 0,
          background: "rgba(10,10,10,0.5)", backdropFilter: "blur(10px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isMobile && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                style={{ background: "transparent", border: "none", color: "#fff", fontSize: "24px", cursor: "pointer" }}
              >
                ☰
              </button>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "10px", fontWeight: 900, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {projectName}
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", textTransform: "uppercase" }}>
                {NAV_ITEMS.find((n) => n.id === activeView)?.label || activeView}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              padding: "4px 12px", background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.1)",
              borderRadius: "20px", display: "flex", alignItems: "center", gap: "8px"
            }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "full", background: "#00ff88", boxShadow: "0 0 10px #00ff88" }} />
              <span style={{ fontSize: "10px", fontWeight: 900, color: "#00ff88", textTransform: "uppercase" }}>
                {credits?.balance || 0} CR
              </span>
            </div>

            {/* Account Menu */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                style={{
                  height: "32px", borderRadius: "8px", padding: "0 10px",
                  border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)",
                  color: "#a3a3a3", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                  transition: "all 0.2s", fontSize: "11px", fontWeight: 700,
                }}
              >
                <div style={{
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #00ff88, #00cc6d)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#000", fontSize: "10px", fontWeight: 900,
                }}>
                  {(userEmail || "U")[0].toUpperCase()}
                </div>
                ▾
              </button>
              {showAccountMenu && (
                <>
                  <div onClick={() => setShowAccountMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
                  <div style={{
                    position: "absolute", right: 0, top: "40px", zIndex: 200,
                    background: "#141414", border: "1px solid #262626", borderRadius: "12px",
                    padding: "8px 0", minWidth: "220px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                  }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #262626" }}>
                      <div style={{ fontSize: "10px", fontWeight: 900, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
                        Account
                      </div>
                      <div style={{ fontSize: "12px", color: "#e5e5e5", fontWeight: 600, wordBreak: "break-all" }}>
                        {userEmail || "—"}
                      </div>
                      <div style={{ fontSize: "10px", color: "#00ff88", fontWeight: 700, textTransform: "uppercase", marginTop: "4px" }}>
                        {credits?.tier || "Free"} • {isAdmin ? "Admin" : "User"}
                      </div>
                    </div>
                    <button
                      onClick={() => { setActiveView("settings"); setShowAccountMenu(false); }}
                      style={{
                        width: "100%", padding: "10px 16px", background: "transparent", border: "none",
                        color: "#a3a3a3", fontSize: "11px", fontWeight: 600, textAlign: "left", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "8px",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      ⚙️ Settings
                    </button>
                    <button
                      onClick={() => { setActiveView("billing"); setShowAccountMenu(false); }}
                      style={{
                        width: "100%", padding: "10px 16px", background: "transparent", border: "none",
                        color: "#a3a3a3", fontSize: "11px", fontWeight: 600, textAlign: "left", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "8px",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      💰 Credits & Billing
                    </button>
                    <div style={{ borderTop: "1px solid #262626", margin: "4px 0" }} />
                    <button
                      onClick={handleSignOut}
                      style={{
                        width: "100%", padding: "10px 16px", background: "transparent", border: "none",
                        color: "#ef4444", fontSize: "11px", fontWeight: 700, textAlign: "left", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "8px", textTransform: "uppercase", letterSpacing: "0.05em",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.05)")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                width: "32px", height: "32px", borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)",
                color: "#525252", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s"
              }}
            >
              {sidebarCollapsed ? "»" : "«"}
            </button>
          </div>
        </header>


        {/* Content area */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          {/* Optional file tree sidebar (when in editor view) */}
          {activeView === "editor" && !isMobile && (
            <div style={{ width: "240px", borderRight: "1px solid #262626", overflow: "auto" }}>
              <FileExplorer
                projectId={projectId}
                onFileSelect={(file: { id: string; path: string; content: string; language: string }) => handleFileSelect(file)}
                compact
              />
            </div>
          )}

          {/* Main view */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {renderActiveView()}
          </div>
        </div>
      </main>
    </div>
  );
}

function EmptyState({ icon, title, message }: { icon: string; title: string; message: string }) {
  return (
    <div style={{
      height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", color: "#525252",
    }}>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>{icon}</div>
      <p style={{ fontSize: "16px", fontWeight: 500, marginBottom: "8px", color: "#737373" }}>{title}</p>
      <p style={{ fontSize: "13px" }}>{message}</p>
    </div>
  );
}

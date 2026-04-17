"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";

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
const ExportToGitHub = dynamic(() => import("@/components/features/ExportToGitHub"), { ssr: false });
const FigmaImport = dynamic(() => import("@/components/features/FigmaImport"), { ssr: false });
const WarRoom = dynamic(() => import("@/components/features/WarRoom"), { ssr: false });

interface NavItem {
  id: string;
  label: string;
  icon: string;
  section: "build" | "ai" | "platform";
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  // Build
  { id: "files", label: "Files", icon: "📁", section: "build" },
  { id: "editor", label: "Editor", icon: "✏️", section: "build" },
  { id: "versions", label: "Versions", icon: "📸", section: "build" },
  { id: "deploy", label: "Deploy", icon: "🚀", section: "build" },
  // AI
  { id: "templates", label: "Templates", icon: "📋", section: "ai" },
  { id: "models", label: "Models", icon: "🧠", section: "ai" },
  { id: "review", label: "Code Review", icon: "🔍", section: "ai" },
  { id: "history", label: "Prompt History", icon: "📜", section: "ai" },
  { id: "suggestions", label: "AI Suggestions", icon: "🧠", section: "ai" },
  { id: "marketplace", label: "Marketplace", icon: "🏪", section: "ai" },
  { id: "war-room", label: "War Room", icon: "⚔️", section: "ai", badge: "LIVE" },
  { id: "figma", label: "Figma Sync", icon: "🎨", section: "ai", badge: "NEW" },
  { id: "components", label: "Components", icon: "🧩", section: "ai" },
  // Platform
  { id: "analytics", label: "Analytics", icon: "📊", section: "platform" },
  { id: "team", label: "Team", icon: "👥", section: "platform" },
  { id: "domains", label: "Domains", icon: "🌐", section: "platform" },
  { id: "webhooks", label: "Webhooks & API", icon: "🔌", section: "platform" },
  { id: "export", label: "Export to GitHub", icon: "📤", section: "platform" },
  { id: "keys", label: "API Keys", icon: "🔑", section: "platform" },
  { id: "notifications", label: "Notifications", icon: "🔔", section: "platform" },
  { id: "settings", label: "Settings", icon: "⚙️", section: "platform" },
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
  projectId: string;
  projectName: string;
  initialVersion?: number;
}

export default function AppLayout({ userId, projectId, projectName, initialVersion = 1 }: AppLayoutProps) {
  const [activeView, setActiveView] = useState("editor");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeFiles, setActiveFiles] = useState<AppFile[]>([]);
  const [currentFile, setCurrentFile] = useState<AppFile | null>(null);
  const [rightPanel, setRightPanel] = useState<"none" | "review" | "versions" | "deploy" | "collab" | "war-room">("none");
  const [currentVersion, setCurrentVersion] = useState(initialVersion);

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

  const toggleRightPanel = (panel: "review" | "versions" | "deploy" | "collab" | "war-room") => {
    setRightPanel((prev) => (prev === panel ? "none" : panel));
  };

  const renderActiveView = () => {
    switch (activeView) {
      case "files":
        return (
          <FileExplorer
            projectId={projectId}
            onFileSelect={(file: { id: string; path: string; content: string; language: string }) => handleFileSelect(file)}
          />
        );
      case "editor":
        return (
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <MultiFileEditor
                projectId={projectId}
                files={activeFiles}
                activeFileId={currentFile?.id}
                onFileSelect={(id: string) => {
                  const f = activeFiles.find((af) => af.id === id);
                  if (f) setCurrentFile(f);
                }}
                onFileClose={handleFileClose}
                onFileSave={async (id: string, content: string) => {
                  setActiveFiles((prev) =>
                    prev.map((f) => (f.id === id ? { ...f, content } : f))
                  );
                  if (currentFile?.id === id) {
                    setCurrentFile((prev) => (prev ? { ...prev, content } : null));
                  }
                }}
              />
            </div>
            {/* Right split panel */}
            {rightPanel !== "none" && (
              <div style={{
                width: "420px", borderLeft: "1px solid #262626",
                display: "flex", flexDirection: "column", overflow: "hidden",
              }}>
                {rightPanel === "review" && currentFile && (
                  <AICodeReview
                    projectId={projectId}
                    fileId={currentFile.id}
                    filePath={currentFile.path}
                    code={currentFile.content}
                    language={currentFile.language}
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
                    projectId={projectId}
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
                          // Refresh files if needed, or just reload page
                          window.location.reload();
                        }
                      } catch (err) {
                        console.error("Rollback failed:", err);
                      }
                    }}
                  />
                )}
                {rightPanel === "deploy" && (
                  <DeploymentPipeline
                    projectId={projectId}
                    projectName={projectName}
                    currentVersion={currentVersion}
                  />
                )}
                {rightPanel === "collab" && (
                  <RealtimeCollab
                    projectId={projectId}
                    userId={userId}
                    userName="You"
                    currentFile={currentFile?.path}
                  />
                )}
                {rightPanel === "war-room" && (
                  <WarRoom
                    projectId={projectId}
                  />
                )}
              </div>
            )}
          </div>
        );
      case "versions":
        return (
          <VersionControl
            projectId={projectId}
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
                console.error("Rollback failed:", err);
              }
            }}
          />
        );
      case "deploy":
        return (
          <DeploymentPipeline
            projectId={projectId}
            projectName={projectName}
            currentVersion={currentVersion}
          />
        );
      case "templates":
        return <PromptTemplates />;
      case "models":
        return <ModelSelector />;
      case "review":
        return currentFile ? (
          <AICodeReview
            projectId={projectId}
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
        return <PromptHistory projectId={projectId} onReplayPrompt={(prompt, model) => { setActiveView("editor"); }} />;
      case "marketplace":
        return <TemplateMarketplace userId={userId} />;
      case "war-room":
        return <WarRoom projectId={projectId} />;
      case "figma":
        return <FigmaImport projectId={projectId} onImportComplete={() => setActiveView("editor")} />;
      case "suggestions":
        return <ContextAwareSuggestions projectId={projectId} currentFile={currentFile?.path} />;
      case "domains":
        return <CustomDomains projectId={projectId} projectName={projectName} />;
      case "webhooks":
        return <WebhooksApiAccess projectId={projectId} />;
      case "export":
        return <ExportToGitHub projectId={projectId} projectName={projectName} />;
      case "notifications":
        return <NotificationCenter userId={userId} />;
      case "settings":
        return <ProjectSettings projectId={projectId} />;
      case "keys":
        return <ApiKeyManager userId={userId} />;
      default:
        return <EmptyState icon="🚀" title="Nexus Prime" message="Select a tool from the sidebar" />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a0a", color: "#e5e5e5", overflow: "hidden" }}>
      {/* Command Palette (global) */}
      <CommandPalette />

      {/* Sidebar */}
      <aside
        style={{
          width: sidebarCollapsed ? "56px" : "200px",
          borderRight: "1px solid #262626",
          display: "flex", flexDirection: "column",
          transition: "width 0.2s ease",
          overflow: "hidden", flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{
          padding: sidebarCollapsed ? "16px 12px" : "16px 16px",
          borderBottom: "1px solid #262626",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {!sidebarCollapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>⚡</span>
              <span style={{ fontSize: "15px", fontWeight: 700, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Nexus Prime
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              width: "28px", height: "28px", borderRadius: "6px",
              border: "1px solid #262626", background: "#171717",
              color: "#737373", cursor: "pointer", fontSize: "12px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? "→" : "←"}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflow: "auto", padding: "8px" }}>
          {(["build", "ai", "platform"] as const).map((section) => (
            <div key={section} style={{ marginBottom: "16px" }}>
              {!sidebarCollapsed && (
                <div style={{
                  padding: "4px 8px", fontSize: "10px", fontWeight: 700,
                  color: "#525252", letterSpacing: "0.05em",
                }}>
                  {SECTION_LABELS[section]}
                </div>
              )}
              {NAV_ITEMS.filter((item) => item.section === section).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  style={{
                    width: "100%",
                    padding: sidebarCollapsed ? "10px 0" : "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: activeView === item.id ? "#6366f130" : "transparent",
                    background: activeView === item.id ? "#1e1b4b" : "transparent",
                    color: activeView === item.id ? "#a5b4fc" : "#a3a3a3",
                    cursor: "pointer", fontSize: "13px",
                    display: "flex", alignItems: "center",
                    justifyContent: sidebarCollapsed ? "center" : "flex-start",
                    gap: "8px", marginBottom: "2px",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: "14px" }}>{item.icon}</span>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                  {!sidebarCollapsed && item.badge && (
                    <span style={{
                      marginLeft: "auto", padding: "1px 6px", borderRadius: "10px",
                      fontSize: "10px", background: "#6366f1", color: "#fff",
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
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
          height: "44px", borderBottom: "1px solid #262626",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", color: "#737373" }}>{projectName}</span>
            <span style={{ color: "#262626" }}>/</span>
            <span style={{ fontSize: "13px", color: "#d4d4d4", fontWeight: 500 }}>
              {NAV_ITEMS.find((n) => n.id === activeView)?.label || activeView}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {/* Right panel toggles (only in editor view) */}
            {activeView === "editor" && (
              <>
                {([
                  { panel: "review" as const, icon: "🔍", label: "Review" },
                  { panel: "versions" as const, icon: "📸", label: "Versions" },
                  { panel: "deploy" as const, icon: "🚀", label: "Deploy" },
                  { panel: "war-room" as const, icon: "⚔️", label: "War Room" },
                  { panel: "collab" as const, icon: "👥", label: "Live" },
                ] as const).map(({ panel, icon, label }) => (
                  <button
                    key={panel}
                    onClick={() => toggleRightPanel(panel)}
                    style={{
                      padding: "4px 10px", borderRadius: "6px",
                      border: "1px solid",
                      borderColor: rightPanel === panel ? "#6366f1" : "#262626",
                      background: rightPanel === panel ? "#1e1b4b" : "transparent",
                      color: rightPanel === panel ? "#a5b4fc" : "#737373",
                      cursor: "pointer", fontSize: "12px",
                      display: "flex", alignItems: "center", gap: "4px",
                    }}
                    title={`Toggle ${label} panel`}
                  >
                    <span>{icon}</span>
                    {label}
                  </button>
                ))}
              </>
            )}
          </div>
        </header>

        {/* Content area */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          {/* Optional file tree sidebar (when in editor view) */}
          {activeView === "editor" && (
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

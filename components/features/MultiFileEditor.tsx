"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Save,
  Play,
  Plus,
  X,
  FileCode,
  Loader2,
  Check,
  AlertCircle,
  Settings2,
} from "lucide-react";
import FileExplorer from "./FileExplorer";

interface ProjectFile {
  id?: string;
  path: string;
  content: string;
  language?: string;
  is_entry_point?: boolean;
}

interface MultiFileEditorProps {
  projectId: string;
  userId?: string;
  onBuild?: (files: ProjectFile[]) => void;
  onVersionCreated?: () => void;
  readOnly?: boolean;
  files?: ProjectFile[];
  activeFileId?: string;
  onFileSelect?: (id: string) => void;
  onFileClose?: (id: string) => void;
  onFileSave?: (id: string, content: string) => Promise<void>;
  onChange?: (files: ProjectFile[]) => void;
}

const DEFAULT_FILES: ProjectFile[] = [
  {
    path: "app/page.tsx",
    content: `export default function Page() {\n  return (\n    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">\n      <h1 className="text-4xl font-bold">Hello, Nexus Prime!</h1>\n    </div>\n  );\n}`,
    language: "typescript",
    is_entry_point: true,
  },
  {
    path: "app/layout.tsx",
    content: `import './globals.css';\n\nexport const metadata = { title: 'Nexus App', description: 'Built with Nexus Prime' };\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}`,
    language: "typescript",
  },
  {
    path: "app/globals.css",
    content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nbody {\n  @apply bg-gray-950 text-white;\n}`,
    language: "css",
  },
];

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    css: "css",
    scss: "scss",
    html: "html",
    json: "json",
    md: "markdown",
    sql: "sql",
    py: "python",
  };
  return map[ext || ""] || "plaintext";
}

export default function MultiFileEditor({
  projectId,
  userId,
  onBuild,
  onVersionCreated,
  readOnly = false,
  onChange,
}: MultiFileEditorProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const supabase = createClient();

  // Presence logic
  useEffect(() => {
    const channel = supabase.channel(`project:${projectId}`);
    
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as any[];
        setCollaborators(users);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [projectId]);

  // Load project files
  useEffect(() => {
    const loadFiles = async () => {
      const { data, error } = await supabase
        .from("project_files")
        .select("*")
        .eq("project_id", projectId)
        .order("path");

      if (data && data.length > 0) {
        setFiles(data);
        const entryPoint = data.find((f: any) => f.is_entry_point)?.path || data[0]?.path;
        setOpenTabs([entryPoint]);
        setActiveTab(entryPoint);
      } else {
        // Initialize with defaults
        setFiles(DEFAULT_FILES);
        setOpenTabs([DEFAULT_FILES[0].path]);
        setActiveTab(DEFAULT_FILES[0].path);
        if (!readOnly) await saveFiles(DEFAULT_FILES);
      }
      setLoading(false);
    };

    loadFiles();
  }, [projectId]);

  // Auto-save & Change callback with debounce
  useEffect(() => {
    if (readOnly) return;
    const timer = setTimeout(() => {
      if (unsavedChanges.size > 0) {
        saveAllFiles();
      }
      if (onChange) {
        onChange(files);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [unsavedChanges, files, onChange]);

  // Keyboard shortcut: Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveAllFiles();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [files]);

  const saveFiles = async (filesToSave: ProjectFile[]) => {
    const filesArray = filesToSave.map(file => ({
      project_id: projectId,
      path: file.path,
      content: file.content,
      language: file.language || detectLanguage(file.path),
      is_entry_point: file.is_entry_point || false,
      size_bytes: new TextEncoder().encode(file.content).length,
    }));

    const { error } = await supabase
      .from("project_files")
      .upsert(filesArray, { onConflict: "project_id,path" });
    
    if (error) throw error;
  };

  const saveAllFiles = async () => {
    if (readOnly) return;
    setSaving(true);
    try {
      await saveFiles(files);
      setUnsavedChanges(new Set());
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
    setSaving(false);
  };

  const updateFileContent = (path: string, content: string) => {
    setFiles((prev) => prev.map((f) => (f.path === path ? { ...f, content } : f)));
    setUnsavedChanges((prev) => new Set(prev).add(path));
  };

  const createFile = (path: string) => {
    if (files.some((f) => f.path === path)) return;
    const newFile: ProjectFile = {
      path,
      content: "",
      language: detectLanguage(path),
    };
    setFiles((prev) => [...prev, newFile]);
    setOpenTabs((prev) => [...prev, path]);
    setActiveTab(path);
    setUnsavedChanges((prev) => new Set(prev).add(path));
  };

  const deleteFile = async (path: string) => {
    if (!confirm(`Delete ${path}?`)) return;
    setFiles((prev) => prev.filter((f) => f.path !== path));
    setOpenTabs((prev) => prev.filter((p) => p !== path));
    if (activeTab === path) {
      const remaining = openTabs.filter((p) => p !== path);
      setActiveTab(remaining[0] || "");
    }
    await supabase
      .from("project_files")
      .delete()
      .eq("project_id", projectId)
      .eq("path", path);
  };

  const renameFile = async (oldPath: string, newPath: string) => {
    if (files.some((f) => f.path === newPath)) return;
    setFiles((prev) =>
      prev.map((f) =>
        f.path === oldPath
          ? { ...f, path: newPath, language: detectLanguage(newPath) }
          : f
      )
    );
    setOpenTabs((prev) => prev.map((p) => (p === oldPath ? newPath : p)));
    if (activeTab === oldPath) setActiveTab(newPath);

    // Delete old, create new in DB
    const file = files.find((f) => f.path === oldPath);
    if (file) {
      await supabase
        .from("project_files")
        .delete()
        .eq("project_id", projectId)
        .eq("path", oldPath);
      setUnsavedChanges((prev) => new Set(prev).add(newPath));
    }
  };

  const selectFile = (path: string) => {
    if (!openTabs.includes(path)) {
      setOpenTabs((prev) => [...prev, path]);
    }
    setActiveTab(path);
  };

  const closeTab = (path: string) => {
    const newTabs = openTabs.filter((p) => p !== path);
    setOpenTabs(newTabs);
    if (activeTab === path) {
      setActiveTab(newTabs[newTabs.length - 1] || "");
    }
  };

  const activeFile = files.find((f) => f.path === activeTab);

  if (loading) {
    return (
      <div className="h-[700px] bg-white/[0.01] border border-white/5 rounded-[32px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00ff88] animate-spin opacity-50" />
      </div>
    );
  }

  return (
    <div className="h-[700px] bg-white/[0.015] border border-white/5 rounded-[32px] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-700 shadow-2xl relative z-10">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-8 py-4 bg-white/[0.02] border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-[#00ff8811] flex items-center justify-center text-[#00ff88]">
            <FileCode size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
              Nexus Source Engine
            </span>
            <span className="text-[8px] font-bold text-[#444] uppercase tracking-widest">Multi-Agent Synchronized Workspace</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Collaborators Stack */}
          <div className="flex items-center -space-x-2 mr-2">
            {collaborators.filter(c => c.id !== userId).slice(0, 5).map((collab) => (
              <div
                key={collab.id}
                className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center text-[9px] font-black text-white shadow-xl transition-transform hover:-translate-y-1 cursor-help"
                style={{ background: collab.color || '#333' }}
                title={`${collab.name} is editing ${collab.activeFile || "nothing"}`}
              >
                {collab.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {collaborators.filter(c => c.id !== userId).length > 5 && (
              <div className="w-7 h-7 rounded-full border-2 border-black bg-[#111] flex items-center justify-center text-[8px] font-black text-[#444]">
                +{collaborators.length - 5}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-white/5 mx-2" />

          <div className="flex items-center gap-4">
            {saveStatus === "saved" && (
              <span className="text-[9px] font-black text-[#00ff88] uppercase tracking-widest flex items-center gap-1.5 bg-[#00ff880a] px-3 py-1.5 rounded-full border border-[#00ff8811]">
                <Check size={10} strokeWidth={4} /> Verified
              </span>
            )}
            {unsavedChanges.size > 0 && (
              <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-1.5 bg-yellow-500/5 px-3 py-1.5 rounded-full border border-yellow-500/10">
                {unsavedChanges.size} Unsynced
              </span>
            )}
            
            {!readOnly && (
              <button
                onClick={saveAllFiles}
                disabled={saving}
                className="text-[10px] font-black uppercase tracking-[0.15em] text-[#525252] hover:text-[#00ff88] transition-all flex items-center gap-2 group"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} className="group-hover:scale-110 transition-transform" />}
                Sync
              </button>
            )}
            
            {onBuild && (
              <button
                onClick={() => onBuild(files)}
                className="bg-[#00ff88] text-black px-6 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-white transition-all shadow-xl active:scale-95"
              >
                <Play size={12} fill="currentColor" />
                Deploy Build
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* File explorer sidebar */}
        <div className="w-64 flex-shrink-0 bg-black/20 border-r border-white/5">
          <FileExplorer
            files={files}
            activeFile={activeTab}
            onSelectFile={selectFile}
            onCreateFile={createFile}
            onDeleteFile={deleteFile}
            onRenameFile={renameFile}
            readOnly={readOnly}
          />
        </div>

        {/* Editor area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-black/40">
          {/* Tabs */}
          <div className="flex bg-black/20 border-b border-white/5 overflow-x-auto custom-scrollbar">
            {openTabs.map((tab) => {
              const isActive = tab === activeTab;
              return (
                <div
                  key={tab}
                  className={`group flex items-center gap-3 px-6 py-4 cursor-pointer border-r border-white/5 transition-all relative min-w-0 ${
                    isActive
                      ? "bg-white/[0.03] text-white"
                      : "text-[#444] hover:text-[#888] hover:bg-white/[0.01]"
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00ff88] shadow-[0_0_10px_#00ff88]" />
                  )}
                  <span className={`text-[11px] font-bold uppercase tracking-widest truncate max-w-[150px] ${isActive ? 'text-[#00ff88]' : ''}`}>
                    {tab.split("/").pop()}
                  </span>
                  {unsavedChanges.has(tab) && (
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all ml-2"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Code editor */}
          <div className="flex-1 overflow-auto relative custom-scrollbar">
            {activeFile ? (
              <div className="h-full relative group/editor">
                <div className="absolute top-4 right-8 z-10 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] font-black text-[#222] uppercase tracking-[0.2em] group-hover/editor:text-[#444] transition-colors">
                  {activeFile.language || detectLanguage(activeFile.path)}
                </div>
                <textarea
                  value={activeFile.content}
                  onChange={(e) => updateFileContent(activeTab, e.target.value)}
                  readOnly={readOnly}
                  className="w-full h-full bg-transparent text-[#d4d4d4] font-mono text-[13px] p-10 resize-none outline-none leading-7 selection:bg-[#00ff8822]"
                  spellCheck={false}
                  style={{ tabSize: 2 }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
                <div className="w-16 h-16 rounded-[32px] border border-white/5 flex items-center justify-center">
                  <FileCode size={32} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Initialize sequence selection...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
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

const supabase =
  typeof window !== "undefined" || process.env.NEXT_PUBLIC_SUPABASE_URL
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
      )
    : (null as any);

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
}: MultiFileEditorProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());

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

  // Auto-save with debounce
  useEffect(() => {
    if (unsavedChanges.size === 0 || readOnly) return;
    const timer = setTimeout(() => saveAllFiles(), 2000);
    return () => clearTimeout(timer);
  }, [unsavedChanges]);

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
    for (const file of filesToSave) {
      await supabase.from("project_files").upsert(
        {
          project_id: projectId,
          path: file.path,
          content: file.content,
          language: file.language || detectLanguage(file.path),
          is_entry_point: file.is_entry_point || false,
          size_bytes: new TextEncoder().encode(file.content).length,
        },
        { onConflict: "project_id,path" }
      );
    }
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
      <div className="h-[700px] bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#00ff88] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[700px] bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#111] border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <FileCode size={14} className="text-[#00ff88]" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#555]">
            Multi-File Editor
          </span>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "saved" && (
            <span className="text-[10px] text-[#00ff88] flex items-center gap-1">
              <Check size={10} /> Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-[10px] text-red-400 flex items-center gap-1">
              <AlertCircle size={10} /> Error
            </span>
          )}
          {unsavedChanges.size > 0 && (
            <span className="text-[10px] text-yellow-500">
              {unsavedChanges.size} unsaved
            </span>
          )}
          {!readOnly && (
            <button
              onClick={saveAllFiles}
              disabled={saving}
              className="text-[10px] uppercase font-bold tracking-widest text-[#555] hover:text-[#00ff88] transition-colors flex items-center gap-1.5 px-2 py-1"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save All
            </button>
          )}
          {onBuild && (
            <button
              onClick={() => onBuild(files)}
              className="text-[10px] uppercase font-bold tracking-widest bg-[#00ff88] text-black px-3 py-1.5 rounded-[2px] hover:bg-[#00ff99] transition-colors flex items-center gap-1.5"
            >
              <Play size={12} /> Build
            </button>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* File explorer sidebar */}
        <div className="w-56 flex-shrink-0">
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
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex bg-[#0a0a0a] border-b border-[#1a1a1a] overflow-x-auto">
            {openTabs.map((tab) => (
              <div
                key={tab}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-r border-[#1a1a1a] min-w-0 ${
                  tab === activeTab
                    ? "bg-[#111] text-white border-b-2 border-b-[#00ff88]"
                    : "text-[#555] hover:text-[#888] hover:bg-[#0d0d0d]"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                <span className="text-xs truncate max-w-[120px]">
                  {tab.split("/").pop()}
                </span>
                {unsavedChanges.has(tab) && (
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab);
                  }}
                  className="hover:text-red-400 flex-shrink-0"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>

          {/* Code editor */}
          <div className="flex-1 overflow-auto">
            {activeFile ? (
              <div className="relative h-full">
                <div className="absolute top-2 right-3 text-[10px] text-[#333]">
                  {activeFile.language || detectLanguage(activeFile.path)}
                </div>
                <textarea
                  value={activeFile.content}
                  onChange={(e) => updateFileContent(activeTab, e.target.value)}
                  readOnly={readOnly}
                  className="w-full h-full bg-transparent text-[#ccc] font-mono text-sm p-4 resize-none outline-none leading-6"
                  spellCheck={false}
                  style={{ tabSize: 2 }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[#333] text-sm">
                Select a file to edit
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

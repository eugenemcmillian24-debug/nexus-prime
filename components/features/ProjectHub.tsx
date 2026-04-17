"use client";

import React, { useState, useEffect } from "react";
import { 
  Rocket, 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Copy, 
  Archive, 
  ExternalLink, 
  Code2, 
  Calendar, 
  Grid, 
  List as ListIcon,
  Loader2,
  AlertTriangle,
  FolderOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  project_files?: { count: number }[];
  current_version?: number;
  is_public?: boolean;
}

export default function ProjectHub() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load projects");
      setProjects(data.projects || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-[#888] font-mono p-8 selection:bg-[#00ff8822] selection:text-[#00ff88]">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex justify-between items-center border-b border-[#1a1a1a] pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00ff88] rounded-sm flex items-center justify-center text-black font-bold text-xl">N</div>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-white uppercase tracking-widest">Project Hub</h1>
              <p className="text-[10px] text-[#444] uppercase tracking-[0.2em]">Central Command & Control</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#333] group-focus-within:text-[#00ff88] transition-colors" />
              <input 
                type="text" 
                placeholder="Filter sequences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0a0a0a] border border-[#1a1a1a] pl-10 pr-4 py-2 text-xs text-white outline-none focus:border-[#00ff88] transition-all w-64 rounded-sm"
              />
            </div>

            <div className="flex bg-[#0a0a0a] border border-[#1a1a1a] p-1 rounded-sm">
              <button 
                onClick={() => setViewMode("grid")}
                className={cn("p-1.5 rounded-sm transition-colors", viewMode === "grid" ? "bg-[#1a1a1a] text-[#00ff88]" : "text-[#333] hover:text-[#555]")}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={cn("p-1.5 rounded-sm transition-colors", viewMode === "list" ? "bg-[#1a1a1a] text-[#00ff88]" : "text-[#333] hover:text-[#555]")}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>

            <Link 
              href="/"
              className="bg-[#00ff88] text-black px-6 py-2.5 font-bold uppercase tracking-widest text-[11px] flex items-center gap-2 hover:bg-[#00cc6d] transition-all rounded-sm active:scale-95 shadow-[0_0_20px_rgba(0,255,136,0.15)]"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
              New Sequence
            </Link>
          </div>
        </header>

        {/* Content */}
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-4 opacity-50">
            <Loader2 className="w-10 h-10 animate-spin text-[#00ff88]" />
            <p className="text-[10px] uppercase tracking-[0.4em]">Initializing Core Filesystems...</p>
          </div>
        ) : error ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <p className="text-red-500 text-xs font-bold uppercase">{error}</p>
            <button onClick={fetchProjects} className="text-[10px] text-[#444] hover:text-white uppercase underline">Retry Connection</button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center space-y-6 opacity-50">
            <FolderOpen className="w-16 h-16 text-[#111]" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#444] uppercase tracking-widest">No Sequences Detected</h3>
              <p className="text-[10px] text-[#222] uppercase tracking-[0.2em]">The database is currently empty or filtered.</p>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {filteredProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onDelete={() => deleteProject(project.id)}
                isDeleting={deletingId === project.id}
              />
            ))}
          </div>
        ) : (
          <div className="border border-[#1a1a1a] bg-[#0a0a0a] rounded-sm overflow-hidden animate-in fade-in duration-500">
            <table className="w-full text-left text-[11px] uppercase tracking-widest">
              <thead className="bg-[#111] border-b border-[#1a1a1a] text-[#444]">
                <tr>
                  <th className="p-4 font-bold">Sequence Name</th>
                  <th className="p-4 font-bold">Files</th>
                  <th className="p-4 font-bold">Last Sync</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {filteredProjects.map((project) => (
                  <ProjectRow 
                    key={project.id} 
                    project={project} 
                    onDelete={() => deleteProject(project.id)}
                    isDeleting={deletingId === project.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <footer className="pt-8 border-t border-[#1a1a1a] text-[10px] uppercase tracking-[0.2em] text-[#333] flex justify-between">
          <div className="flex gap-4">
            <span>Core Storage: Connected</span>
            <span className="text-[#111]">Total Sequences: {projects.length}</span>
          </div>
          <span>© 2026 NEXUS PRIME OS</span>
        </footer>
      </div>
    </div>
  );
}

function ProjectCard({ project, onDelete, isDeleting }: { project: Project; onDelete: () => void; isDeleting: boolean }) {
  return (
    <div className="group bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#00ff8844] transition-all relative overflow-hidden rounded-sm flex flex-col h-64">
      {/* Visual Metaphor / Thumbnail Placeholder */}
      <div className="h-32 bg-[#050505] border-b border-[#1a1a1a] flex items-center justify-center group-hover:bg-[#00ff8803] transition-colors relative overflow-hidden">
        <Code2 className="w-12 h-12 text-[#111] group-hover:text-[#00ff8811] transition-all group-hover:scale-110" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
          <Link 
            href={`/dashboard?project=${project.id}`}
            className="w-full bg-white text-black py-2 text-[9px] font-bold uppercase tracking-[0.3em] text-center hover:bg-[#00ff88] transition-colors"
          >
            Launch Sequence
          </Link>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <h3 className="text-white font-bold text-sm tracking-tight truncate pr-4">{project.name}</h3>
            <div className="flex gap-2">
              <button 
                onClick={onDelete}
                disabled={isDeleting}
                className="text-[#333] hover:text-red-500 transition-colors disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-[#444] line-clamp-2 leading-relaxed uppercase tracking-wider">
            {project.description || "No description provided for this build sequence."}
          </p>
        </div>

        <div className="flex justify-between items-center pt-4 text-[8px] text-[#222] font-bold uppercase tracking-widest border-t border-[#1a1a1a]/50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(project.updated_at).toLocaleDateString()}</span>
            <span className="flex items-center gap-1 text-[#444]"><Rocket className="w-3 h-3" /> v{project.current_version || 1}</span>
          </div>
          <span className="text-[#00ff8822]">{project.project_files?.[0]?.count || 0} Files</span>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({ project, onDelete, isDeleting }: { project: Project; onDelete: () => void; isDeleting: boolean }) {
  return (
    <tr className="hover:bg-[#111] transition-colors group">
      <td className="p-4">
        <div className="flex flex-col">
          <Link href={`/dashboard?project=${project.id}`} className="text-white font-bold hover:text-[#00ff88] transition-colors">{project.name}</Link>
          <span className="text-[8px] text-[#333] mt-0.5 lowercase tracking-normal">{project.id}</span>
        </div>
      </td>
      <td className="p-4 text-[#444] font-bold">{project.project_files?.[0]?.count || 0}</td>
      <td className="p-4 text-[#444]">{new Date(project.updated_at).toLocaleDateString()}</td>
      <td className="p-4 text-right">
        <div className="flex justify-end items-center gap-4">
          <Link href={`/dashboard?project=${project.id}`} className="text-[#444] hover:text-[#00ff88] transition-colors"><ExternalLink className="w-4 h-4" /></Link>
          <button 
            onClick={onDelete}
            disabled={isDeleting}
            className="text-[#444] hover:text-red-500 transition-colors disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </td>
    </tr>
  );
}

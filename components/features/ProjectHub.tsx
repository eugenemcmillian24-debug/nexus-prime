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
    <div className="min-h-screen bg-[#050505] text-[#a3a3a3] font-sans p-10 selection:bg-[#00ff8822] selection:text-[#00ff88] relative z-10">
      <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-white/5 pb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#00ff88] rounded-2xl flex items-center justify-center text-black font-black text-2xl shadow-[0_0_20px_rgba(0,255,136,0.3)]">N</div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter text-white uppercase leading-none">Project Hub</h1>
                <p className="text-[10px] text-[#525252] font-bold uppercase tracking-[0.4em] mt-1">Central Command & Control Layer</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">
            <div className="relative group/search flex-1 md:flex-none min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444] group-focus-within/search:text-[#00ff88] transition-colors" />
              <input
                type="text"
                placeholder="SEARCH BUILD SEQUENCES..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/5 pl-12 pr-6 py-4 text-[11px] font-bold text-white uppercase tracking-widest outline-none focus:border-[#00ff8833] focus:bg-white/[0.04] transition-all rounded-2xl shadow-xl"
              />
            </div>

            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 p-1.5 rounded-2xl backdrop-blur-md">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-2.5 rounded-xl transition-all duration-300", viewMode === "grid" ? "bg-[#00ff88] text-black shadow-lg shadow-[#00ff88]/20" : "text-[#444] hover:text-white")}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-2.5 rounded-xl transition-all duration-300", viewMode === "list" ? "bg-[#00ff88] text-black shadow-lg shadow-[#00ff88]/20" : "text-[#444] hover:text-white")}
              >
                <ListIcon className="w-5 h-5" />
              </button>
            </div>

            <Link
              href="/"
              className="bg-white text-black px-8 py-4 font-black uppercase tracking-widest text-[11px] flex items-center gap-3 hover:bg-[#00ff88] transition-all rounded-2xl active:scale-95 shadow-2xl"
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
              New Sequence
            </Link>
          </div>
        </header>

        {/* Content */}
        {loading ? (
          <div className="h-[60vh] flex flex-col items-center justify-center gap-6 opacity-80">
            <div className="w-16 h-16 border-2 border-[#00ff8822] border-t-[#00ff88] rounded-full animate-spin shadow-[0_0_20px_rgba(0,255,136,0.1)]" />
            <div className="text-[10px] font-black uppercase tracking-[0.5em] text-[#444] animate-pulse">Initializing Core Filesystems...</div>
          </div>
        ) : error ? (
          <div className="h-[50vh] flex flex-col items-center justify-center gap-6">
            <div className="w-20 h-20 bg-red-500/5 border border-red-500/10 rounded-[40px] flex items-center justify-center text-red-500 shadow-2xl">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <p className="text-red-400 text-xs font-black uppercase tracking-widest">{error}</p>
            <button onClick={fetchProjects} className="text-[10px] font-bold text-[#444] hover:text-white uppercase tracking-widest underline transition-colors">Retry Connection</button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="h-[50vh] flex flex-col items-center justify-center text-center gap-8 opacity-60">
            <div className="w-24 h-24 rounded-[48px] bg-white/[0.02] border border-white/5 flex items-center justify-center">
              <FolderOpen className="w-10 h-10 text-[#222]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white uppercase tracking-widest">No Sequences Detected</h3>
              <p className="text-[10px] text-[#444] font-bold uppercase tracking-[0.3em]">The database is currently empty or filtered.</p>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
          <div className="border border-white/5 bg-white/[0.01] rounded-[32px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-2xl">
            <table className="w-full text-left text-[11px] font-bold uppercase tracking-widest">
              <thead className="bg-white/[0.02] border-b border-white/5 text-[#444]">
                <tr>
                  <th className="px-8 py-6">Sequence Name</th>
                  <th className="px-8 py-6">Architecture</th>
                  <th className="px-8 py-6">Last Sync</th>
                  <th className="px-8 py-6 text-right">Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
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
        <footer className="pt-12 border-t border-white/5 text-[9px] font-black uppercase tracking-[0.4em] text-[#222] flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-8">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" /> Core Storage: Connected</span>
            <span>Total Sequences: {projects.length}</span>
          </div>
          <span>© 2026 NEXUS PRIME OS // ROOT ACCESS</span>
        </footer>
      </div>
    </div>
  );

}

function ProjectCard({ project, onDelete, isDeleting }: { project: Project; onDelete: () => void; isDeleting: boolean }) {
  return (
    <div className="group relative bg-white/[0.015] border border-white/5 hover:border-[#00ff8844] transition-all duration-500 overflow-hidden rounded-[32px] flex flex-col h-80 shadow-2xl hover:-translate-y-2">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00ff8808] rounded-full blur-3xl group-hover:bg-[#00ff8815] transition-all duration-700" />
      
      {/* Visual Metaphor */}
      <div className="h-40 bg-black/40 border-b border-white/5 flex items-center justify-center group-hover:bg-black/20 transition-all relative overflow-hidden">
        <div className="relative z-10 transition-transform duration-700 group-hover:scale-125">
          <Code2 className="w-14 h-14 text-[#222] group-hover:text-[#00ff8822]" />
        </div>
        
        {/* Launch Overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-gradient-to-t from-black via-black/40 to-transparent flex items-end justify-center p-8 backdrop-blur-[2px]">
          <Link
            href={`/dashboard?project=${project.id}`}
            className="w-full bg-[#00ff88] text-black py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-center shadow-2xl hover:bg-white transition-all active:scale-95"
          >
            Launch Protocol
          </Link>
        </div>
      </div>

      <div className="p-8 flex-1 flex flex-col justify-between relative z-10">
        <div className="space-y-3">
          <div className="flex justify-between items-start gap-4">
            <h3 className="text-white font-black text-lg tracking-tight truncate leading-none uppercase">{project.name}</h3>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="p-2 rounded-lg bg-white/5 border border-white/5 text-[#444] hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50 shrink-0"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-[#525252] font-bold uppercase tracking-widest line-clamp-2 leading-relaxed">
            {project.description || "No system documentation provided for this build sequence."}
          </p>
        </div>

        <div className="flex justify-between items-center pt-6 text-[9px] font-black uppercase tracking-[0.3em] border-t border-white/5">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-2 text-[#444]"><Calendar className="w-3.5 h-3.5" /> {new Date(project.updated_at).toLocaleDateString()}</span>
            <span className="flex items-center gap-2 text-[#00ff88]"><Rocket className="w-3.5 h-3.5" /> V{project.current_version || 1}</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/5 text-[#444]">
            {project.project_files?.[0]?.count || 0} ARCHIVES
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({ project, onDelete, isDeleting }: { project: Project; onDelete: () => void; isDeleting: boolean }) {
  return (
    <tr className="hover:bg-white/[0.03] transition-all group">
      <td className="px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-[#444] group-hover:text-[#00ff88] transition-colors">
            <Code2 size={20} />
          </div>
          <div className="flex flex-col">
            <Link href={`/dashboard?project=${project.id}`} className="text-white font-black hover:text-[#00ff88] transition-all uppercase tracking-tight text-sm">{project.name}</Link>
            <span className="text-[9px] font-mono text-[#222] mt-1 tracking-widest group-hover:text-[#444] transition-colors">{project.id}</span>
          </div>
        </div>
      </td>
      <td className="px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]/30 border border-[#00ff88]" />
          <span className="text-[#444] font-black">{project.project_files?.[0]?.count || 0} MODULES</span>
        </div>
      </td>
      <td className="px-8 py-6 text-[#444] font-bold">{new Date(project.updated_at).toLocaleDateString()}</td>
      <td className="px-8 py-6 text-right">
        <div className="flex justify-end items-center gap-3">
          <Link 
            href={`/dashboard?project=${project.id}`} 
            className="p-3 rounded-xl bg-white/5 border border-white/5 text-[#444] hover:text-[#00ff88] hover:bg-[#00ff8811] transition-all"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-3 rounded-xl bg-white/5 border border-white/5 text-[#444] hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </td>
    </tr>
  );
}


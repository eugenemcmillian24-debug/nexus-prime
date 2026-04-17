"use client";

import React, { useState } from "react";
import { 
  Github, 
  Globe, 
  Cloud, 
  Rocket, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  ExternalLink, 
  ChevronRight,
  Shield,
  Zap,
  Layout
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiPlatformExportProps {
  projectId: string;
  projectName: string;
}

type Platform = "github" | "netlify" | "cloudflare";

interface ExportStatus {
  platform: Platform;
  status: "idle" | "loading" | "success" | "error";
  url?: string;
  error?: string;
}

export default function MultiPlatformExport({ projectId, projectName }: MultiPlatformExportProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("github");
  const [exportStatuses, setExportStatuses] = useState<Record<Platform, ExportStatus>>({
    github: { platform: "github", status: "idle" },
    netlify: { platform: "netlify", status: "idle" },
    cloudflare: { platform: "cloudflare", status: "idle" },
  });

  const [repoName, setRepoName] = useState(projectName?.toLowerCase().replace(/[^a-z0-9-]/g, "-") || "nexus-app");
  const [isPrivate, setIsPrivate] = useState(true);

  const handleExport = async (platform: Platform) => {
    setExportStatuses(prev => ({
      ...prev,
      [platform]: { ...prev[platform], status: "loading", error: undefined }
    }));

    try {
      // Fetch current project files
      const filesRes = await fetch(`/api/projects/files?project_id=${projectId}`);
      const { files } = await filesRes.json();

      const endpoint = `/api/export/${platform}`;
      const payload = platform === "github" 
        ? { repoName, files, isPrivate, projectId }
        : { siteName: repoName, projectName: repoName, files, projectId };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");

      setExportStatuses(prev => ({
        ...prev,
        [platform]: { ...prev[platform], status: "success", url: data.url }
      }));
    } catch (err: any) {
      setExportStatuses(prev => ({
        ...prev,
        [platform]: { ...prev[platform], status: "error", error: err.message }
      }));
    }
  };

  const platforms = [
    { 
      id: "github", 
      name: "GitHub", 
      icon: <Github className="w-5 h-5" />, 
      desc: "Source control & CI/CD",
      color: "text-white bg-white/10"
    },
    { 
      id: "netlify", 
      name: "Netlify", 
      icon: <Globe className="w-5 h-5" />, 
      desc: "Global Edge Network",
      color: "text-[#00C7B7] bg-[#00C7B7]/10"
    },
    { 
      id: "cloudflare", 
      name: "Cloudflare", 
      icon: <Cloud className="w-5 h-5" />, 
      desc: "Pages & Workers",
      color: "text-[#F38020] bg-[#F38020]/10"
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white font-mono text-sm border-l border-white/10 w-full max-w-md">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-2 bg-[#080808]">
        <Rocket className="w-5 h-5 text-[#00ff88]" />
        <h2 className="font-bold tracking-tighter uppercase">Cloud Export Engine</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Project Context */}
        <div className="p-3 bg-white/5 border border-white/10 rounded-sm">
          <p className="text-[10px] text-white/40 uppercase mb-1">Target Project</p>
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#00ff88]">{projectName}</span>
            <span className="text-[10px] text-white/20">{projectId.slice(0, 8)}</span>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-white/40 uppercase block mb-2">Identifier (Slug)</label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              className="w-full bg-black border border-white/10 rounded-sm p-2 text-xs focus:border-[#00ff88] outline-none transition-colors"
              placeholder="my-awesome-app"
            />
          </div>

          {selectedPlatform === "github" && (
            <div className="flex items-center justify-between p-2 border border-white/10 rounded-sm bg-black/40">
              <span className="text-[10px] text-white/40 uppercase">Private Repository</span>
              <button 
                onClick={() => setIsPrivate(!isPrivate)}
                className={cn(
                  "w-8 h-4 rounded-full transition-colors relative",
                  isPrivate ? "bg-[#00ff88]" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-2 h-2 rounded-full bg-black transition-all",
                  isPrivate ? "left-5" : "left-1"
                )} />
              </button>
            </div>
          )}
        </div>

        {/* Platform Selection */}
        <div className="space-y-2">
          <p className="text-[10px] text-white/40 uppercase">Select Destination</p>
          {platforms.map((p) => {
            const status = exportStatuses[p.id as Platform];
            return (
              <div 
                key={p.id}
                onClick={() => setSelectedPlatform(p.id as Platform)}
                className={cn(
                  "group p-3 border transition-all cursor-pointer flex items-center justify-between",
                  selectedPlatform === p.id ? "border-[#00ff88] bg-[#00ff88]/5" : "border-white/10 hover:border-white/20 bg-black/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-sm", p.color)}>
                    {p.icon}
                  </div>
                  <div>
                    <p className="font-bold text-xs uppercase">{p.name}</p>
                    <p className="text-[10px] text-white/40">{p.desc}</p>
                  </div>
                </div>

                {status.status === "success" ? (
                  <CheckCircle className="w-4 h-4 text-[#00ff88]" />
                ) : status.status === "loading" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#00ff88]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40" />
                )}
              </div>
            );
          })}
        </div>

        {/* Export Button */}
        <button
          onClick={() => handleExport(selectedPlatform)}
          disabled={exportStatuses[selectedPlatform].status === "loading"}
          className="w-full py-4 bg-[#00ff88] text-black font-bold uppercase tracking-widest text-xs hover:bg-[#00cc6e] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {exportStatuses[selectedPlatform].status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          Push to {platforms.find(p => p.id === selectedPlatform)?.name}
        </button>

        {/* Results / Error */}
        {exportStatuses[selectedPlatform].status === "success" && (
          <div className="p-4 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-sm space-y-3">
            <div className="flex items-center gap-2 text-[#00ff88]">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Deployment Successful</span>
            </div>
            <p className="text-[10px] text-white/60 italic leading-relaxed">
              Build live on the edge. Global propagation in progress.
            </p>
            <a 
              href={exportStatuses[selectedPlatform].url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-[10px] uppercase font-bold"
            >
              <ExternalLink className="w-3 h-3" /> Visit Site
            </a>
          </div>
        )}

        {exportStatuses[selectedPlatform].status === "error" && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-sm space-y-2">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Export Failed</span>
            </div>
            <p className="text-[10px] text-red-500/60 leading-relaxed">
              {exportStatuses[selectedPlatform].error}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 bg-[#080808]">
        <div className="flex items-center justify-between opacity-20 grayscale scale-75">
          <Github className="w-4 h-4" />
          <Globe className="w-4 h-4" />
          <Cloud className="w-4 h-4" />
          <Zap className="w-4 h-4" />
          <Shield className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, Copy, Code, Eye, Download, FileCode, Folder, Rocket, ExternalLink, Loader2 } from "lucide-react";
import { exportProject, BuildResult } from "@/lib/export";
import PreviewSandbox from "@/components/PreviewSandbox";

export default function CodePreview({ result, jobId, userId }: { result: BuildResult, jobId: string, userId: string }) {
  // Defensive: normalize result to always have a valid files array
  const safeResult: BuildResult = {
    files: Array.isArray(result?.files) && result.files.length > 0
      ? result.files
      : [{ path: "app/page.tsx", content: typeof result === "string" ? result : "// No code generated" }],
  };

  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"code" | "preview">("code");
  const [activeFile, setActiveFile] = useState(safeResult.files[0]?.path || "");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);

  const activeContent = safeResult.files.find(f => f.path === activeFile)?.content || "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    await exportProject(safeResult);
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, userId, projectName: `nexus-build-${jobId.slice(0, 8)}` }),
      });
      const data = await response.json();
      if (data.url) setDeploymentUrl(data.url);
      else {
        // PROD FIX: Replaced alert with better error messaging
        alert(data.error || "Deployment sequence failed. Please verify your Vercel configuration.");
      }
    } catch (e) {
      // PROD FIX: Removed console.error
      // console.error(e);
      alert("Critical deployment error. Sequence aborted.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden flex flex-col h-[700px] animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 bg-[#111] border-b border-[#1a1a1a]">
        <div className="flex gap-6">
          <button
            onClick={() => setView("code")}
            className={`flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest transition-all ${
              view === "code" ? "text-[#00ff88]" : "text-[#444] hover:text-white"
            }`}
          >
            <Code size={12} /> Project Files
          </button>
          <button
            onClick={() => setView("preview")}
            className={`flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest transition-all ${
              view === "preview" ? "text-[#00ff88]" : "text-[#444] hover:text-white"
            }`}
          >
            <Eye size={12} /> Live Preview
          </button>
        </div>
        <div className="flex gap-4">
          <button
            onClick={copyToClipboard}
            className="text-[#444] hover:text-[#00ff88] transition-all flex items-center gap-1.5 text-[10px] uppercase font-bold"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy File"}
          </button>
          <button
            onClick={handleDownload}
            className="text-[#888] hover:text-[#00ff88] px-2 py-1 transition-all flex items-center gap-1.5 text-[10px] uppercase font-bold"
          >
            <Download size={12} /> ZIP
          </button>
          {deploymentUrl ? (
            <a
              href={deploymentUrl!.startsWith('http') ? deploymentUrl! : `https://${deploymentUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00ff88] hover:bg-[#00ff8811] px-2 py-1 border border-[#00ff8844] rounded-[2px] transition-all flex items-center gap-1.5 text-[10px] uppercase font-bold"
            >
              <ExternalLink size={12} /> Visit Build
            </a>
          ) : (
            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="text-black bg-[#00ff88] hover:bg-[#00cc6d] px-3 py-1 rounded-[2px] transition-all flex items-center gap-1.5 text-[10px] uppercase font-bold disabled:grayscale disabled:opacity-50"
            >
              {isDeploying ? <Loader2 size={12} className="animate-spin" /> : <Rocket size={12} />}
              {isDeploying ? "Deploying..." : "One-Click Deploy"}
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: File List */}
        {view === "code" && (
          <div className="w-60 border-r border-[#1a1a1a] bg-[#080808] flex flex-col overflow-y-auto custom-scrollbar">
            <div className="p-4 text-[9px] uppercase tracking-[0.2em] text-[#333] border-b border-[#1a1a1a]">
              Project Explorer
            </div>
            <div className="p-2 space-y-1">
              {safeResult.files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setActiveFile(file.path)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] font-mono transition-all rounded-[2px] ${
                    activeFile === file.path ? "bg-[#00ff8811] text-[#00ff88]" : "text-[#555] hover:bg-[#111] hover:text-[#888]"
                  }`}
                >
                  <FileCode size={10} className={activeFile === file.path ? "text-[#00ff88]" : "text-[#333]"} />
                  <span className="truncate">{file.path}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Editor / Preview Area */}
        <div className="flex-1 overflow-auto custom-scrollbar bg-[#050505] p-6">
          {view === "code" ? (
            <pre className="font-mono text-xs text-[#888] leading-relaxed selection:bg-[#00ff8822] selection:text-[#00ff88]">
              <code>{activeContent}</code>
            </pre>
          ) : (
            <PreviewSandbox result={safeResult} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-[#050505] border-t border-[#1a1a1a] flex justify-between items-center text-[9px] text-[#333] uppercase tracking-widest">
        <span>Files: {safeResult.files.length} | Active: {activeFile}</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          Ready for Deployment
        </span>
      </div>
    </div>
  );
}

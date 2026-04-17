"use client";

import React, { useState } from "react";
import { 
  Figma, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Key, 
  Link as LinkIcon, 
  FileCode 
} from "lucide-react";

interface FigmaImportProps {
  projectId: string;
  onImportComplete?: () => void;
}

export default function FigmaImport({ projectId, onImportComplete }: FigmaImportProps) {
  const [figmaUrl, setFigmaUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "importing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [importedFiles, setImportedFiles] = useState<{ path: string }[]>([]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!figmaUrl || !accessToken) return;

    setIsLoading(true);
    setStatus("importing");
    setErrorMessage("");
    setImportedFiles([]);

    try {
      const response = await fetch("/api/import/figma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figmaUrl, accessToken, projectId }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setImportedFiles(data.files || []);
        if (onImportComplete) onImportComplete();
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Failed to import from Figma.");
      }
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-[#e5e5e5] p-10 font-mono">
      <div className="max-w-2xl mx-auto w-full space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#F24E1E] rounded-sm flex items-center justify-center text-white">
              <Figma size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tighter uppercase">Figma Blueprint Sync</h2>
              <p className="text-[#737373] text-xs uppercase tracking-widest">Visual-to-Code Pipeline v1.0</p>
            </div>
          </div>
          <p className="text-sm text-[#a3a3a3] leading-relaxed">
            Translate Figma nodes directly into high-fidelity React components. 
            Nexus Prime extracts styles, layout, and structure to generate production-ready code.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleImport} className="space-y-6">
          <div className="space-y-4">
            <label className="block text-[10px] text-[#525252] uppercase tracking-[0.2em] font-bold">
              Figma Frame/Node URL
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#404040]" size={16} />
              <input
                type="url"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                placeholder="https://www.figma.com/file/..."
                className="w-full bg-[#111] border border-[#262626] p-4 pl-12 text-sm outline-none focus:border-[#00ff88] transition-colors rounded-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] text-[#525252] uppercase tracking-[0.2em] font-bold">
                Personal Access Token
              </label>
              <a 
                href="https://www.figma.com/settings/developers" 
                target="_blank" 
                className="text-[9px] text-[#00ff88] hover:underline uppercase tracking-widest"
              >
                Get Token →
              </a>
            </div>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-[#404040]" size={16} />
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="figd_..."
                className="w-full bg-[#111] border border-[#262626] p-4 pl-12 text-sm outline-none focus:border-[#00ff88] transition-colors rounded-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !figmaUrl || !accessToken}
            className="w-full bg-[#00ff88] text-black py-4 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-[#00cc6d] transition-all disabled:opacity-50 disabled:grayscale"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Analyzing Blueprint...
              </>
            ) : (
              <>
                Sync with Nexus <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Status / Results */}
        {status === "success" && (
          <div className="bg-[#00ff8808] border border-[#00ff8822] p-6 space-y-4 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 text-[#00ff88]">
              <CheckCircle2 size={20} />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Blueprint Successfully Synced</span>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] text-[#525252] uppercase tracking-widest">Imported Components:</div>
              <div className="grid grid-cols-2 gap-2">
                {importedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-[#a3a3a3] bg-[#111] p-2 border border-[#1a1a1a]">
                    <FileCode size={12} className="text-[#00ff88]" />
                    {file.path.split('/').pop()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="bg-[#ef444408] border border-[#ef444422] p-6 space-y-2 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 text-[#ef4444]">
              <AlertCircle size={20} />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Synchronization Failed</span>
            </div>
            <p className="text-[11px] text-[#737373] uppercase leading-relaxed">{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

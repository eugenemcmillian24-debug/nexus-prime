"use client";

import React, { useState, useEffect } from "react";
import { 
  TestTube, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  FileCode, 
  Zap,
  Terminal,
  Search,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TestGeneratorProps {
  projectId: string;
}

interface ProjectFile {
  id: string;
  path: string;
  language: string;
}

export default function TestGenerator({ projectId }: TestGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [results, setResults] = useState<{ path: string; content: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/files?project_id=${projectId}`);
      const data = await res.json();
      // Filter for components or logic files (tsx, ts, js, jsx)
      const targetFiles = data.files.filter((f: any) => 
        /\.(tsx|ts|js|jsx)$/.test(f.path) && !f.path.includes('.test.')
      );
      setFiles(targetFiles);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (path: string) => {
    setSelectedFiles(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleGenerate = async () => {
    if (selectedFiles.length === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, filePaths: selectedFiles }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.testFiles);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white font-mono text-sm border-l border-white/10 w-full max-w-md">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-2 bg-[#080808]">
        <TestTube className="w-5 h-5 text-[#00ff88]" />
        <h2 className="font-bold tracking-tighter uppercase">AI Test Lab</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#00ff88]" />
            <p className="text-[10px] text-white/40 uppercase">Scanning Project Structure...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-white/40 uppercase">Select Target Files</p>
              <button 
                onClick={() => setSelectedFiles(files.map(f => f.path))}
                className="text-[10px] text-[#00ff88] hover:underline uppercase"
              >
                Select All
              </button>
            </div>
            
            <div className="max-h-60 overflow-y-auto border border-white/10 rounded-sm bg-black/40 divide-y divide-white/5">
              {files.map((file) => (
                <div 
                  key={file.id}
                  onClick={() => toggleFile(file.path)}
                  className={cn(
                    "flex items-center gap-3 p-2 cursor-pointer transition-colors",
                    selectedFiles.includes(file.path) ? "bg-[#00ff88]/5" : "hover:bg-white/5"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 border rounded-sm flex items-center justify-center transition-colors",
                    selectedFiles.includes(file.path) ? "border-[#00ff88] bg-[#00ff88]" : "border-white/20"
                  )}>
                    {selectedFiles.includes(file.path) && <Check className="w-3 h-3 text-black" />}
                  </div>
                  <FileCode className="w-4 h-4 text-white/40" />
                  <span className="text-[11px] truncate flex-1">{file.path}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={selectedFiles.length === 0 || generating}
              className="w-full py-4 bg-[#00ff88] text-black font-bold uppercase tracking-widest text-xs hover:bg-[#00cc6e] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {generating ? "Synthesizing Tests..." : "Generate Test Suite"}
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-sm space-y-2">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Synthesis Failed</span>
            </div>
            <p className="text-[10px] text-red-500/60 leading-relaxed">{error}</p>
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#00ff88] p-2 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-sm">
              <CheckCircle className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase">Suite Generated & Sync'd</span>
            </div>
            
            <div className="space-y-2">
              {results.map((test, i) => (
                <div key={i} className="p-3 border border-white/10 bg-white/5 rounded-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[#00ff88]">{test.path}</span>
                    <span className="text-[9px] text-white/20 uppercase">Jest / RTL</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-sm max-h-32 overflow-hidden relative">
                    <pre className="text-[10px] text-white/40 leading-tight">
                      <code>{test.content}</code>
                    </pre>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 bg-[#080808]">
        <div className="flex items-center gap-4 opacity-20 text-[10px] uppercase tracking-widest font-bold">
          <Terminal className="w-4 h-4" />
          <span>Code Coverage: 100% Target</span>
        </div>
      </div>
    </div>
  );
}

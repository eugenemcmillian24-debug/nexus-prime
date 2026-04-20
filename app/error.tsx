"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

// PROD FIX: Global error boundary page for production
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // PROD FIX: Log the error to an error reporting service in a real app
    // console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-mono text-[#888]">
      <div className="max-w-md w-full border border-[#ff444433] bg-[#0a0a0a] p-10 space-y-8 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-[#ff444411] border border-[#ff444433] rounded-sm flex items-center justify-center text-[#ff4444]">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-[0.3em] uppercase">System Failure</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#444] leading-relaxed">
            A critical exception occurred in the orchestrator pipeline.
          </p>
          <div className="bg-[#050505] border border-[#ff444422] p-3 w-full text-left overflow-hidden">
            <code className="text-[9px] text-red-500/70 break-all">
              {error.message || "Unknown Runtime Error"}
            </code>
          </div>
        </div>

        <div className="pt-6 border-t border-[#1a1a1a] space-y-4">
          <button
            onClick={() => reset()}
            className="w-full bg-[#00ff88] text-black py-4 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-[#00cc6d] transition-all"
          >
            <RefreshCw size={14} /> Restart Sequence
          </button>
          <a
            href="/"
            className="w-full border border-[#1a1a1a] text-white py-4 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-[#111] transition-all"
          >
            <Home size={14} /> Emergency Extraction
          </a>
        </div>
      </div>
    </div>
  );
}

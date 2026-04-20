"use client";

import Link from "next/link";
import { Terminal as TerminalIcon, Home, AlertCircle } from "lucide-react";

// PROD FIX: Custom 404 page for Nexus Prime
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-mono text-[#888]">
      <div className="max-w-md w-full border border-[#1a1a1a] bg-[#0a0a0a] p-10 space-y-8 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-[#ff444411] border border-[#ff444433] rounded-sm flex items-center justify-center text-[#ff4444]">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-[0.3em] uppercase">404 Error</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#444] leading-relaxed">
            The requested sequence address does not exist in our neural archives.
          </p>
        </div>

        <div className="pt-6 border-t border-[#1a1a1a] space-y-4">
          <Link
            href="/"
            className="w-full bg-[#00ff88] text-black py-4 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-[#00cc6d] transition-all"
          >
            <Home size={14} /> Return to Home
          </Link>
          <div className="flex items-center justify-center gap-2 text-[8px] text-[#222] uppercase tracking-[0.4em]">
            <TerminalIcon size={10} /> Nexus Prime Global Operations
          </div>
        </div>
      </div>
    </div>
  );
}

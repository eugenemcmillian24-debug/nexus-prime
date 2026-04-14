"use client";

import { createClient } from "@supabase/supabase-js";
import { Github, Terminal } from "lucide-react";

const supabase = (typeof window !== 'undefined' || process.env.NEXT_PUBLIC_SUPABASE_URL) ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
) : null as any;

export default function Login() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-8 text-center border border-[#1a1a1a] p-10 bg-[#0a0a0a] rounded-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-[#00ff88] rounded-sm flex items-center justify-center text-black font-bold text-2xl">
            N
          </div>
          <h1 className="text-white text-xl font-bold tracking-[0.3em] uppercase">Nexus Prime</h1>
          <p className="text-[#444] text-xs uppercase tracking-widest leading-relaxed">
            Multi-Agent AI Builder System<br />
            Authorization Required
          </p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-white text-black py-4 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-[#00ff88] transition-all active:scale-[0.98]"
        >
          <Github size={16} />
          Sign in with GitHub
        </button>

        <div className="pt-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-[8px] text-[#222] uppercase tracking-[0.4em]">
            <Terminal size={10} /> Secure Encryption Active
          </div>
          <div className="text-[8px] text-[#222] uppercase tracking-[0.4em]">
            © 2026 NEXUS PRIME CORP
          </div>
        </div>
      </div>
    </div>
  );
}

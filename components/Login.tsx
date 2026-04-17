"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Github, Terminal, Mail, Lock, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  const handleOAuthLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        alert("Check your email for the confirmation link!");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full space-y-8 text-center border border-[#1a1a1a] p-10 bg-[#0a0a0a] rounded-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-[#00ff88] rounded-sm flex items-center justify-center text-black font-bold text-2xl">
          N
        </div>
        <h1 className="text-white text-xl font-bold tracking-[0.3em] uppercase">Nexus Prime</h1>
        <p className="text-[#444] text-xs uppercase tracking-widest leading-relaxed">
          Multi-Agent AI Builder System<br />
          {isLogin ? "Authorization Required" : "Create New Identity"}
        </p>
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] py-2 px-3 uppercase tracking-widest">
            {error}
          </div>
        )}
        
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333]" size={14} />
          <input
            type="email"
            placeholder="EMAIL ADDRESS"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-[#050505] border border-[#1a1a1a] py-3 pl-10 pr-4 text-white text-[10px] tracking-widest outline-none focus:border-[#00ff88] transition-colors"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333]" size={14} />
          <input
            type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-[#050505] border border-[#1a1a1a] py-3 pl-10 pr-4 text-white text-[10px] tracking-widest outline-none focus:border-[#00ff88] transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#00ff88] text-black py-4 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-[#00cc6d] transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : (isLogin ? "Initialize Session" : "Generate Identity")}
        </button>
      </form>

      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#1a1a1a]"></div>
        </div>
        <div className="relative flex justify-center text-[8px] uppercase tracking-[0.3em]">
          <span className="bg-[#0a0a0a] px-2 text-[#222]">OR SECURE OAUTH</span>
        </div>
      </div>

      <button
        onClick={handleOAuthLogin}
        className="w-full bg-white text-black py-4 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-[#00ff88] transition-all active:scale-[0.98]"
      >
        <Github size={16} />
        Continue with GitHub
      </button>

      <button
        onClick={() => setIsLogin(!isLogin)}
        className="text-[10px] text-[#444] uppercase tracking-[0.2em] hover:text-white transition-colors"
      >
        {isLogin ? "[ Create New Account ]" : "[ Return to Login ]"}
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
  );
}

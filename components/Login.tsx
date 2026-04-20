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
    <div className="max-w-md w-full space-y-10 text-center border border-white/5 p-12 bg-white/[0.02] backdrop-blur-2xl rounded-[40px] shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-b from-[#00ff8805] to-transparent pointer-events-none" />
      
      <div className="flex flex-col items-center gap-6 relative z-10">
        <div className="w-14 h-14 bg-[#00ff88] rounded-2xl flex items-center justify-center text-black font-black text-3xl shadow-[0_0_30px_rgba(0,255,136,0.3)] group-hover:scale-110 transition-transform duration-500">
          N
        </div>
        <div className="space-y-1">
          <h1 className="text-white text-2xl font-black tracking-tighter uppercase">Nexus Prime</h1>
          <p className="text-[#525252] text-[10px] font-bold uppercase tracking-[0.4em]">
            {isLogin ? "Authorization Protocol" : "Identity Generation"}
          </p>
        </div>
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-5 relative z-10">
        {error && (
          <div className="bg-red-500/5 border border-red-500/20 text-red-400 text-[10px] py-3 px-4 rounded-xl font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="relative group/input">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444] group-focus-within/input:text-[#00ff88] transition-colors" size={16} />
            <input
              type="email"
              placeholder="EMAIL ADDRESS"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white/[0.03] border border-white/5 py-4 pl-12 pr-4 text-white text-[11px] font-bold tracking-[0.15em] outline-none rounded-2xl focus:border-[#00ff8833] focus:bg-white/[0.05] transition-all"
            />
          </div>

          <div className="relative group/input">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444] group-focus-within/input:text-[#00ff88] transition-colors" size={16} />
            <input
              type="password"
              placeholder="PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-white/[0.03] border border-white/5 py-4 pl-12 pr-4 text-white text-[11px] font-bold tracking-[0.15em] outline-none rounded-2xl focus:border-[#00ff8833] focus:bg-white/[0.05] transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#00ff88] text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-[#00cc6d] transition-all active:scale-[0.98] disabled:opacity-50 shadow-[0_20px_40px_rgba(0,255,136,0.15)]"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : (isLogin ? "Initialize Session" : "Generate Identity")}
        </button>
      </form>

      <div className="relative py-2 relative z-10">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/5"></div>
        </div>
        <div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.3em]">
          <span className="bg-[#0a0a0a] px-4 text-[#444]">OR SECURE OAUTH</span>
        </div>
      </div>

      <button
        onClick={handleOAuthLogin}
        className="w-full bg-white/5 border border-white/10 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-[0.98] relative z-10"
      >
        <Github size={18} />
        Continue with GitHub
      </button>

      <button
        onClick={() => setIsLogin(!isLogin)}
        className="text-[10px] font-bold text-[#444] uppercase tracking-[0.2em] hover:text-[#00ff88] transition-colors relative z-10"
      >
        {isLogin ? "[ Create New Account ]" : "[ Return to Login ]"}
      </button>

      <div className="pt-4 flex flex-col items-center gap-3 relative z-10">
        <div className="flex items-center gap-2 text-[8px] font-bold text-[#222] uppercase tracking-[0.4em]">
          <Terminal size={10} /> Secure Encryption Active
        </div>
      </div>
    </div>
  );

}

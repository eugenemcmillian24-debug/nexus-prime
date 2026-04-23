"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Github, Terminal, Mail, Lock, Loader2, CheckCircle2, RefreshCw, ArrowLeft, KeyRound } from "lucide-react";

type AuthStep = "credentials" | "verify-email" | "success";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<AuthStep>("credentials");

  const supabase = createClient();

  const handleOAuthLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Successful login — page.tsx auth state change listener will redirect
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;

        // Supabase returns a user with an empty `identities` array when the
        // email is already registered but not yet confirmed. No new email is
        // sent for this case, so explicitly trigger a resend and route to the
        // verify-email screen instead of silently appearing to succeed.
        const alreadyRegistered =
          !!data.user &&
          Array.isArray(data.user.identities) &&
          data.user.identities.length === 0;

        if (alreadyRegistered) {
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });
          // Tolerate rate limits — the user may already have a valid code.
          if (
            resendError &&
            !resendError.message.toLowerCase().includes("rate limit")
          ) {
            throw resendError;
          }
          setStep("verify-email");
          return;
        }

        // If email confirmation is required, show verify screen
        if (data.user && !data.session) {
          setStep("verify-email");
        }
        // If confirmation is disabled in Supabase, session exists immediately
        if (data.session) {
          setStep("success");
        }
      }
    } catch (err: any) {
      // Make common errors human-readable
      const msg = err.message || "Authentication failed";
      if (msg.includes("Email not confirmed")) {
        setStep("verify-email");
      } else if (msg.includes("User already registered")) {
        setError("This email is already registered. Try signing in instead.");
        setIsLogin(true);
      } else if (msg.includes("Invalid login credentials")) {
        setError("Incorrect email or password. Please try again.");
      } else if (msg.includes("Email rate limit exceeded")) {
        setError("Too many attempts. Please wait a few minutes before trying again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;
    setVerifying(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "signup",
      });
      if (error) throw error;

      if (data.session) {
        setStep("success");
        // Session is now active — auth state listener will redirect
      }
    } catch (err: any) {
      const msg = err.message || "Verification failed";
      if (msg.includes("expired") || msg.includes("invalid")) {
        setError("Invalid or expired code. Please request a new one.");
      } else {
        setError(msg);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setOtpCode("");
      setError(null);
    } catch (err: any) {
      setError(err.message.includes("rate limit")
        ? "Please wait 60 seconds before requesting another verification email."
        : err.message
      );
    } finally {
      setResending(false);
    }
  };

  // ── VERIFY EMAIL SCREEN ─────────────────────────────────────
  if (step === "verify-email") {
    return (
      <div className="max-w-md w-full text-center border border-white/5 p-12 bg-white/[0.02] backdrop-blur-2xl rounded-[40px] shadow-2xl space-y-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00ff8805] to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-[40px] bg-[#00ff8811] border border-[#00ff8822] flex items-center justify-center">
            <KeyRound size={36} className="text-[#00ff88]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Enter Verification Code</h2>
            <p className="text-[#525252] text-xs font-bold uppercase tracking-[0.3em]">Check Your Inbox</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <p className="text-sm text-[#a3a3a3] leading-relaxed">
            A 6-digit verification code has been sent to{" "}
            <span className="text-[#00ff88] font-bold">{email}</span>.
            <br />Enter the code below to activate your account.
          </p>

          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="relative group/input">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444] group-focus-within/input:text-[#00ff88] transition-colors" size={16} />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
                className="w-full bg-white/[0.03] border border-white/5 py-5 pl-12 pr-4 text-white text-center text-2xl font-black tracking-[0.5em] outline-none rounded-2xl focus:border-[#00ff8833] focus:bg-white/[0.05] transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-500/5 border border-red-500/20 text-red-400 text-[10px] py-3 px-4 rounded-xl font-bold uppercase tracking-widest">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={verifying || otpCode.length !== 6}
              className="w-full bg-[#00ff88] text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-[#00cc6d] transition-all active:scale-[0.98] disabled:opacity-50 shadow-[0_20px_40px_rgba(0,255,136,0.15)]"
            >
              {verifying ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              {verifying ? "Verifying..." : "Verify & Activate"}
            </button>
          </form>

          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 text-left">
            <p className="text-[10px] font-black text-white uppercase tracking-widest">Didn&apos;t receive it?</p>
            {[
              "Check your spam / junk folder",
              "Make sure the email address is correct",
              "Wait 60 seconds before resending",
            ].map((tip, i) => (
              <div key={i} className="flex items-center gap-3 text-[11px] text-[#525252] font-bold uppercase tracking-wide">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]/40 border border-[#00ff88] shrink-0" />
                {tip}
              </div>
            ))}
          </div>

          <button
            onClick={handleResendVerification}
            disabled={resending}
            className="w-full bg-white/5 border border-white/10 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-white/10 transition-all disabled:opacity-50"
          >
            {resending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {resending ? "Sending..." : "Resend Verification Code"}
          </button>

          <button
            onClick={() => { setStep("credentials"); setError(null); setOtpCode(""); }}
            className="flex items-center justify-center gap-2 text-[10px] font-bold text-[#444] uppercase tracking-[0.2em] hover:text-[#00ff88] transition-colors mx-auto"
          >
            <ArrowLeft size={12} /> Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── CREDENTIALS SCREEN ──────────────────────────────────────
  return (
    <div className="max-w-md w-full space-y-10 text-center border border-white/5 p-12 bg-white/[0.02] backdrop-blur-2xl rounded-[40px] shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-b from-[#00ff8805] to-transparent pointer-events-none" />

      <div className="flex flex-col items-center gap-6 relative z-10">
        <div className="w-14 h-14 bg-[#00ff88] rounded-2xl flex items-center justify-center text-black font-black text-3xl shadow-[0_0_30px_rgba(0,255,136,0.3)] group-hover:scale-110 transition-transform duration-500">
          N
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tighter uppercase text-white">Nexus Prime</h1>
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
              minLength={6}
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

      <div className="relative py-2 z-10">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/5" />
        </div>
        <div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.3em]">
          <span className="bg-[#050505] px-4 text-[#444]">OR SECURE OAUTH</span>
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
        onClick={() => { setIsLogin(!isLogin); setError(null); }}
        className="text-[10px] font-bold text-[#444] uppercase tracking-[0.2em] hover:text-[#00ff88] transition-colors relative z-10"
      >
        {isLogin ? "[ Create New Account ]" : "[ Return to Login ]"}
      </button>

      <div className="pt-4 flex items-center justify-center gap-2 text-[8px] font-bold text-[#222] uppercase tracking-[0.4em] relative z-10">
        <Terminal size={10} /> Secure Encryption Active
      </div>
    </div>
  );
}

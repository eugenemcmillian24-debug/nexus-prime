"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Login from "@/components/Login";
import Link from "next/link";

function LoginContent() {
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get("message");

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative">
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, #1a1a1a 1px, transparent 1px), linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute top-8 left-8 z-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-[10px] font-bold text-[#444] uppercase tracking-widest hover:text-[#00ff88] transition-colors"
        >
          ← Back to Overview
        </Link>
      </div>

      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        {errorMsg && (
          <div className="w-full bg-red-500/5 border border-red-500/20 text-red-400 text-[11px] py-4 px-6 rounded-2xl font-bold uppercase tracking-widest text-center">
            ⚠ {decodeURIComponent(errorMsg)}
          </div>
        )}
        <Login />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

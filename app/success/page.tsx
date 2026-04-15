"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#888] font-mono flex items-center justify-center p-8 selection:bg-[#00ff8822] selection:text-[#00ff88]">
      <div className="max-w-lg w-full space-y-8 text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 bg-[#00ff88] rounded-sm flex items-center justify-center text-black font-bold">
            N
          </div>
          <h1 className="text-xl font-bold tracking-tighter text-white uppercase tracking-widest">
            Nexus Prime
          </h1>
        </div>

        {/* Success Card */}
        <div className="border border-[#00ff8844] bg-[#0a0a0a] p-10 space-y-6">
          <div className="w-16 h-16 mx-auto border-2 border-[#00ff88] rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[#00ff88]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <h2 className="text-[#00ff88] text-lg font-bold tracking-widest uppercase">
              Payment Successful
            </h2>
            <p className="text-[#666] text-sm">
              Your subscription is now active. Credits have been added to your
              account.
            </p>
          </div>

          {sessionId && (
            <div className="text-[#333] text-xs break-all border-t border-[#1a1a1a] pt-4">
              Session: {sessionId}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 bg-[#00ff88] text-black font-bold text-xs uppercase tracking-widest hover:bg-[#00cc6a] transition-all"
            >
              Start Building →
            </button>
            <p className="text-[#444] text-xs">
              Redirecting in {countdown}s…
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="w-12 h-12 border border-dashed border-[#00ff88] rounded-full animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}

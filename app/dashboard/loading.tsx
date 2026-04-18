"use client";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-zinc-500 text-sm">Loading your workspace...</p>
      </div>
    </div>
  );
}

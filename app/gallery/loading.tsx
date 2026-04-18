"use client";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#050505] p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 rounded-xl p-4 space-y-3">
              <div className="h-40 bg-zinc-800 rounded-lg animate-pulse" />
              <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

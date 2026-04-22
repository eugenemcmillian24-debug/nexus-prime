export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-2 border-[#00ff88]/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-transparent border-t-[#00ff88] rounded-full animate-spin" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#333] animate-pulse">
          Initializing Dashboard
        </p>
      </div>
    </div>
  );
}

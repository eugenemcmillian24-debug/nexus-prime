import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center space-y-6 p-8 max-w-md">
        <div className="text-8xl font-black text-emerald-500/20">404</div>
        <h1 className="text-2xl font-bold text-white">Page not found</h1>
        <p className="text-zinc-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm"
          >
            Go home
          </Link>
          <Link
            href="/gallery"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm"
          >
            Browse gallery
          </Link>
        </div>
      </div>
    </div>
  );
}

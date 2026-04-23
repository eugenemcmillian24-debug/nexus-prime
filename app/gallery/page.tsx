"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  Heart,
  Eye,
  ArrowLeft,
  Search,
  SlidersHorizontal,
  ExternalLink,
  Code,
} from "lucide-react";
import Link from "next/link";

const supabase = typeof window !== 'undefined' ? createClient() : (null as any);

interface PublishedBuild {
  id: string;
  title: string;
  description: string;
  tags: string[];
  likes_count: number;
  views_count: number;
  created_at: string;
  preview_url: string | null;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

export default function GalleryPage() {
  const [builds, setBuilds] = useState<PublishedBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"latest" | "popular" | "views">("latest");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    fetchBuilds();
  }, [sort]);

  const fetchBuilds = async () => {
    setLoading(true);
    const res = await fetch(`/api/gallery?sort=${sort}&limit=24`);
    const data = await res.json();
    setBuilds(data.builds || []);
    setLoading(false);
  };

  const handleLike = async (buildId: string) => {
    if (!user) return;

    const { error } = await supabase.from("build_likes").insert({
      user_id: user.id,
      build_id: buildId,
    });

    if (!error) {
      setBuilds((prev) =>
        prev.map((b) =>
          b.id === buildId ? { ...b, likes_count: b.likes_count + 1 } : b
        )
      );
    }
  };

  const filteredBuilds = search
    ? builds.filter(
        (b) =>
          b.title.toLowerCase().includes(search.toLowerCase()) ||
          (b.tags || []).some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : builds;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[#444] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold tracking-[0.2em] uppercase">
              Community Gallery
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search builds..."
                className="bg-[#0a0a0a] border border-[#1a1a1a] text-sm pl-10 pr-4 py-2 rounded-sm text-white placeholder:text-[#333] focus:outline-none focus:border-[#00ff88]/50 w-64"
              />
            </div>
            {/* Sort */}
            <div className="flex items-center border border-[#1a1a1a] rounded-sm overflow-hidden">
              {(["latest", "popular", "views"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`px-3 py-2 text-xs uppercase tracking-wider transition-colors ${
                    sort === s
                      ? "bg-[#00ff88]/10 text-[#00ff88]"
                      : "text-[#444] hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="text-center py-20 text-[#444] animate-pulse">
            Loading gallery...
          </div>
        ) : filteredBuilds.length === 0 ? (
          <div className="text-center py-20">
            <Code className="w-12 h-12 text-[#222] mx-auto mb-4" />
            <p className="text-[#444]">
              No builds published yet. Be the first!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBuilds.map((build) => (
              <div
                key={build.id}
                className="border border-[#1a1a1a] bg-[#0a0a0a] rounded-sm overflow-hidden group hover:border-[#00ff88]/30 transition-colors"
              >
                {/* Preview */}
                <div className="aspect-video bg-[#111] relative">
                  {build.preview_url ? (
                    <iframe
                      src={build.preview_url}
                      className="w-full h-full"
                      sandbox="allow-scripts"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#222]">
                      <Code className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button onClick={() => build.preview_url && window.open(build.preview_url, "_blank")} className="p-2 bg-[#00ff88] text-black rounded-sm hover:bg-[#00cc6a]" title="Open Preview">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button onClick={() => window.location.href = `/dashboard?id=${build.id}`} className="p-2 bg-white/10 text-white rounded-sm hover:bg-white/20" title="View Source">
                      <Code className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-sm font-bold text-white mb-1 truncate">
                    {build.title}
                  </h3>
                  {build.description && (
                    <p className="text-xs text-[#444] mb-3 line-clamp-2">
                      {build.description}
                    </p>
                  )}

                  {/* Tags */}
                  {(build.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(build.tags || []).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 bg-[#111] text-[#555] border border-[#1a1a1a] rounded-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#222]" />
                      <span className="text-xs text-[#555]">
                        {build.profiles?.full_name || "Anonymous"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#444]">
                      <button
                        onClick={() => handleLike(build.id)}
                        className="flex items-center gap-1 hover:text-red-400 transition-colors"
                      >
                        <Heart className="w-3 h-3" />
                        {build.likes_count}
                      </button>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {build.views_count}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  History,
  Star,
  GitFork,
  ChevronRight,
  Loader2,
  Clock,
  Trash2,
} from "lucide-react";

const supabase = createClient();

interface Build {
  id: string;
  prompt: string;
  title: string | null;
  status: string;
  version: number;
  parent_job_id: string | null;
  is_starred: boolean;
  created_at: string;
  result: any;
}

export default function ProjectHistory({
  userId,
  onLoadBuild,
  onForkBuild,
}: {
  userId: string;
  onLoadBuild: (build: Build) => void;
  onForkBuild: (build: Build) => void;
}) {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "starred">("all");

  useEffect(() => {
    fetchBuilds();
  }, [userId, filter]);

  const fetchBuilds = async () => {
    setLoading(true);
    let query = supabase
      .from("agent_jobs")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter === "starred") {
      query = query.eq("is_starred", true);
    }

    const { data } = await query;
    setBuilds(data || []);
    setLoading(false);
  };

  const toggleStar = async (buildId: string, current: boolean) => {
    await supabase
      .from("agent_jobs")
      .update({ is_starred: !current })
      .eq("id", buildId);

    setBuilds((prev) =>
      prev.map((b) =>
        b.id === buildId ? { ...b, is_starred: !current } : b
      )
    );
  };

  return (
    <div className="border border-[#1a1a1a] bg-[#0a0a0a] rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#00ff88]" />
          <span className="text-xs text-[#888] uppercase tracking-widest font-bold">
            Project History
          </span>
        </div>
        <div className="flex items-center border border-[#1a1a1a] rounded-sm overflow-hidden">
          {(["all", "starred"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                filter === f
                  ? "bg-[#00ff88]/10 text-[#00ff88]"
                  : "text-[#444] hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto divide-y divide-[#111]">
        {loading ? (
          <div className="p-6 text-center">
            <Loader2 className="w-4 h-4 animate-spin text-[#444] mx-auto" />
          </div>
        ) : builds.length === 0 ? (
          <div className="p-6 text-center text-[#444] text-sm">
            {filter === "starred" ? "No starred builds" : "No builds yet"}
          </div>
        ) : (
          builds.map((build) => (
            <div
              key={build.id}
              className="px-4 py-3 flex items-center gap-3 hover:bg-[#111] transition-colors group"
            >
              {/* Star */}
              <button
                onClick={() => toggleStar(build.id, build.is_starred)}
                className="shrink-0"
              >
                <Star
                  className={`w-4 h-4 transition-colors ${
                    build.is_starred
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-[#222] hover:text-yellow-400"
                  }`}
                />
              </button>

              {/* Info */}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onLoadBuild(build)}
              >
                <p className="text-sm text-white truncate">
                  {build.title || build.prompt?.slice(0, 50) || "Untitled"}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-[#444]">
                  <Clock className="w-3 h-3" />
                  {new Date(build.created_at).toLocaleDateString()}
                  <span className="text-[#222]">·</span>
                  v{build.version || 1}
                  {build.parent_job_id && (
                    <>
                      <span className="text-[#222]">·</span>
                      <span className="text-[#00ff88]/50">refined</span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onForkBuild(build)}
                  className="p-1.5 text-[#444] hover:text-[#00ff88] transition-colors"
                  title="Fork this build"
                >
                  <GitFork className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onLoadBuild(build)}
                  className="p-1.5 text-[#444] hover:text-white transition-colors"
                  title="Load build"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

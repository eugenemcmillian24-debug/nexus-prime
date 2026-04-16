"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  GitBranch,
  GitCommit,
  RotateCcw,
  Clock,
  Plus,
  Minus,
  FileCode,
  ChevronDown,
  ChevronRight,
  Loader2,
  Save,
  Eye,
  AlertTriangle,
  Check,
  Diff,
} from "lucide-react";

const supabase =
  typeof window !== "undefined" || process.env.NEXT_PUBLIC_SUPABASE_URL
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
      )
    : (null as any);

interface Version {
  id: string;
  version_number: number;
  message: string;
  snapshot: { path: string; content: string; language?: string }[];
  diff_summary?: { added: string[]; modified: string[]; deleted: string[] };
  created_at: string;
}

interface VersionControlProps {
  projectId: string;
  userId: string;
  onRollback?: (versionNumber: number) => void;
  currentFiles?: { path: string; content: string }[];
}

function computeDiff(
  oldFiles: { path: string; content: string }[],
  newFiles: { path: string; content: string }[]
): { added: string[]; modified: string[]; deleted: string[] } {
  const oldMap = new Map(oldFiles.map((f) => [f.path, f.content]));
  const newMap = new Map(newFiles.map((f) => [f.path, f.content]));

  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];

  for (const [path, content] of newMap) {
    if (!oldMap.has(path)) added.push(path);
    else if (oldMap.get(path) !== content) modified.push(path);
  }
  for (const path of oldMap.keys()) {
    if (!newMap.has(path)) deleted.push(path);
  }

  return { added, modified, deleted };
}

function LineDiff({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");
  const maxLines = Math.max(oldLines.length, newLines.length);

  const diffLines: { type: "same" | "added" | "removed" | "modified"; old?: string; new?: string; lineNum: number }[] = [];

  for (let i = 0; i < maxLines; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : undefined;
    const newLine = i < newLines.length ? newLines[i] : undefined;

    if (oldLine === newLine) {
      diffLines.push({ type: "same", old: oldLine, new: newLine, lineNum: i + 1 });
    } else if (oldLine === undefined) {
      diffLines.push({ type: "added", new: newLine, lineNum: i + 1 });
    } else if (newLine === undefined) {
      diffLines.push({ type: "removed", old: oldLine, lineNum: i + 1 });
    } else {
      diffLines.push({ type: "removed", old: oldLine, lineNum: i + 1 });
      diffLines.push({ type: "added", new: newLine, lineNum: i + 1 });
    }
  }

  // Only show changed lines and nearby context (3 lines)
  const contextRange = 3;
  const changedIndices = new Set<number>();
  diffLines.forEach((line, idx) => {
    if (line.type !== "same") {
      for (let j = Math.max(0, idx - contextRange); j <= Math.min(diffLines.length - 1, idx + contextRange); j++) {
        changedIndices.add(j);
      }
    }
  });

  if (changedIndices.size === 0) {
    return <div className="text-[#333] text-xs px-4 py-2">No changes</div>;
  }

  let lastShown = -2;
  return (
    <div className="font-mono text-xs overflow-x-auto">
      {diffLines.map((line, idx) => {
        if (!changedIndices.has(idx)) return null;

        const showSeparator = idx - lastShown > 1 && lastShown >= 0;
        lastShown = idx;

        return (
          <div key={idx}>
            {showSeparator && (
              <div className="text-[#333] bg-[#0d0d0d] px-4 py-0.5 text-center border-y border-[#1a1a1a]">
                ···
              </div>
            )}
            <div
              className={`flex ${
                line.type === "added"
                  ? "bg-[#00ff8810] text-[#00ff88]"
                  : line.type === "removed"
                  ? "bg-[#ff000010] text-[#ff4444]"
                  : "text-[#555]"
              }`}
            >
              <span className="w-10 text-right px-2 py-0.5 text-[#333] border-r border-[#1a1a1a] select-none flex-shrink-0">
                {line.lineNum}
              </span>
              <span className="w-5 text-center py-0.5 flex-shrink-0">
                {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
              </span>
              <span className="px-2 py-0.5 whitespace-pre">
                {line.type === "removed" ? line.old : line.new ?? line.old}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function VersionControl({
  projectId,
  userId,
  onRollback,
  currentFiles = [],
}: VersionControlProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [showCommitForm, setShowCommitForm] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [diffView, setDiffView] = useState<{
    versionId: string;
    filePath: string;
  } | null>(null);
  const [rollbackConfirm, setRollbackConfirm] = useState<number | null>(null);

  useEffect(() => {
    loadVersions();
  }, [projectId]);

  const loadVersions = async () => {
    const { data } = await supabase
      .from("project_versions")
      .select("*")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false });

    setVersions(data || []);
    setLoading(false);
  };

  const createVersion = async () => {
    if (!commitMessage.trim()) return;
    setCommitting(true);

    try {
      const { data, error } = await supabase.rpc("create_version", {
        p_project_id: projectId,
        p_message: commitMessage.trim(),
      });

      if (!error) {
        await loadVersions();
        setCommitMessage("");
        setShowCommitForm(false);
      }
    } catch (err) {
      console.error(err);
    }
    setCommitting(false);
  };

  const handleRollback = async (versionNumber: number) => {
    try {
      const { error } = await supabase.rpc("rollback_to_version", {
        p_project_id: projectId,
        p_version_number: versionNumber,
      });

      if (!error) {
        onRollback?.(versionNumber);
        setRollbackConfirm(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getVersionDiff = (version: Version): { added: string[]; modified: string[]; deleted: string[] } => {
    if (version.diff_summary) return version.diff_summary;

    const idx = versions.findIndex((v) => v.id === version.id);
    const prevVersion = versions[idx + 1];
    if (!prevVersion) {
      return { added: version.snapshot.map((f) => f.path), modified: [], deleted: [] };
    }
    return computeDiff(prevVersion.snapshot, version.snapshot);
  };

  const getDiffContent = (version: Version, filePath: string) => {
    const idx = versions.findIndex((v) => v.id === version.id);
    const prevVersion = versions[idx + 1];
    const oldContent = prevVersion?.snapshot.find((f) => f.path === filePath)?.content || "";
    const newContent = version.snapshot.find((f) => f.path === filePath)?.content || "";
    return { oldContent, newContent };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#00ff88] animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <GitBranch size={14} className="text-[#00ff88]" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#555]">
            Version History
          </span>
          <span className="text-[10px] text-[#333]">
            {versions.length} version{versions.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={() => setShowCommitForm(!showCommitForm)}
          className="text-[10px] uppercase font-bold tracking-widest bg-[#00ff88] text-black px-3 py-1.5 rounded-[2px] hover:bg-[#00ff99] transition-colors flex items-center gap-1.5"
        >
          <GitCommit size={12} /> Create Version
        </button>
      </div>

      {/* Commit form */}
      {showCommitForm && (
        <div className="px-4 py-3 border-b border-[#1a1a1a] bg-[#0d0d0d]">
          <div className="flex gap-2">
            <input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  createVersion();
                }
              }}
              placeholder="Describe your changes..."
              className="flex-1 bg-[#111] text-white text-sm px-3 py-2 rounded border border-[#333] outline-none focus:border-[#00ff88]/50 placeholder-[#333]"
              autoFocus
            />
            <button
              onClick={createVersion}
              disabled={committing || !commitMessage.trim()}
              className="text-[10px] uppercase font-bold tracking-widest bg-[#00ff88] text-black px-4 py-2 rounded-[2px] hover:bg-[#00ff99] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {committing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Save size={12} />
              )}
              Commit
            </button>
          </div>
          {currentFiles.length > 0 && versions.length > 0 && (
            <div className="mt-2 text-[10px] text-[#555]">
              {(() => {
                const diff = computeDiff(versions[0].snapshot, currentFiles);
                const total = diff.added.length + diff.modified.length + diff.deleted.length;
                if (total === 0) return "No changes since last version";
                return `${total} change${total > 1 ? "s" : ""}: ${
                  diff.added.length ? `${diff.added.length} added` : ""
                } ${diff.modified.length ? `${diff.modified.length} modified` : ""} ${
                  diff.deleted.length ? `${diff.deleted.length} deleted` : ""
                }`.trim();
              })()}
            </div>
          )}
        </div>
      )}

      {/* Version list */}
      <div className="max-h-[500px] overflow-y-auto">
        {versions.length === 0 ? (
          <div className="text-center py-12 text-[#333]">
            <GitBranch size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No versions yet</p>
            <p className="text-xs mt-1">Create your first version to start tracking changes</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {versions.map((version, idx) => {
              const diff = getVersionDiff(version);
              const isExpanded = expandedVersion === version.id;
              const totalChanges = diff.added.length + diff.modified.length + diff.deleted.length;

              return (
                <div key={version.id}>
                  <div
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[#ffffff05] cursor-pointer transition-colors"
                    onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
                  >
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center mt-1">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          idx === 0 ? "bg-[#00ff88]" : "bg-[#333]"
                        }`}
                      />
                      {idx < versions.length - 1 && (
                        <div className="w-px h-8 bg-[#1a1a1a] mt-1" />
                      )}
                    </div>

                    {/* Version info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium truncate">
                          {version.message}
                        </span>
                        {idx === 0 && (
                          <span className="text-[9px] uppercase font-bold tracking-widest bg-[#00ff8820] text-[#00ff88] px-1.5 py-0.5 rounded-sm flex-shrink-0">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-[#555]">
                        <span className="flex items-center gap-1">
                          <GitCommit size={10} /> v{version.version_number}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {formatDate(version.created_at)}
                        </span>
                        <span>
                          {diff.added.length > 0 && (
                            <span className="text-green-500 mr-2">
                              +{diff.added.length}
                            </span>
                          )}
                          {diff.modified.length > 0 && (
                            <span className="text-yellow-500 mr-2">
                              ~{diff.modified.length}
                            </span>
                          )}
                          {diff.deleted.length > 0 && (
                            <span className="text-red-400">
                              -{diff.deleted.length}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {idx !== 0 && (
                        <>
                          {rollbackConfirm === version.version_number ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRollback(version.version_number);
                                }}
                                className="text-[9px] uppercase font-bold bg-red-500/20 text-red-400 px-2 py-1 rounded-[2px] hover:bg-red-500/30"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRollbackConfirm(null);
                                }}
                                className="text-[9px] uppercase font-bold text-[#555] px-2 py-1 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRollbackConfirm(version.version_number);
                              }}
                              className="text-[#444] hover:text-[#00ff88] transition-colors p-1"
                              title="Rollback to this version"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </>
                      )}
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-[#555]" />
                      ) : (
                        <ChevronRight size={14} className="text-[#333]" />
                      )}
                    </div>
                  </div>

                  {/* Expanded diff view */}
                  {isExpanded && (
                    <div className="border-t border-[#1a1a1a] bg-[#080808]">
                      {/* Changed files list */}
                      <div className="px-4 py-2 border-b border-[#1a1a1a]">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#333]">
                          Changed Files ({totalChanges})
                        </span>
                      </div>
                      {[...diff.added, ...diff.modified, ...diff.deleted].map((filePath) => {
                        const changeType = diff.added.includes(filePath)
                          ? "added"
                          : diff.deleted.includes(filePath)
                          ? "deleted"
                          : "modified";
                        const isShowingDiff =
                          diffView?.versionId === version.id &&
                          diffView?.filePath === filePath;

                        return (
                          <div key={filePath}>
                            <div
                              className="flex items-center gap-2 px-4 py-1.5 hover:bg-[#ffffff05] cursor-pointer"
                              onClick={() =>
                                setDiffView(
                                  isShowingDiff
                                    ? null
                                    : { versionId: version.id, filePath }
                                )
                              }
                            >
                              {changeType === "added" && (
                                <Plus size={12} className="text-green-500" />
                              )}
                              {changeType === "modified" && (
                                <FileCode size={12} className="text-yellow-500" />
                              )}
                              {changeType === "deleted" && (
                                <Minus size={12} className="text-red-400" />
                              )}
                              <span
                                className={`text-xs ${
                                  changeType === "deleted"
                                    ? "text-red-400 line-through"
                                    : "text-[#888]"
                                }`}
                              >
                                {filePath}
                              </span>
                            </div>
                            {isShowingDiff && changeType !== "deleted" && (
                              <div className="border-t border-b border-[#1a1a1a] bg-[#060606]">
                                <LineDiff
                                  {...getDiffContent(version, filePath)}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {totalChanges === 0 && (
                        <div className="px-4 py-3 text-[#333] text-xs">
                          Initial version — all files added
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

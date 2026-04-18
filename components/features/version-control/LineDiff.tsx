"use client";

import React, { memo } from "react";

export function computeDiff(
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


export default memo(LineDiff);

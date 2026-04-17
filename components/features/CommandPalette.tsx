"use client";

import { useState, useEffect, useCallback } from "react";
import { Keyboard, Command, Search } from "lucide-react";

interface Shortcut {
  key: string;
  modifiers: ("ctrl" | "meta" | "shift" | "alt")[];
  label: string;
  description: string;
  action: () => void;
}

interface CommandPaletteProps {
  shortcuts?: Shortcut[];
  commands?: { id: string; label: string; action: () => void; category?: string }[];
}

export default function CommandPalette({ shortcuts = [], commands = [] }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Register keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle palette with Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Check registered shortcuts
      for (const shortcut of shortcuts) {
        const modMatch = shortcut.modifiers.every((mod) => {
          if (mod === "ctrl") return e.ctrlKey;
          if (mod === "meta") return e.metaKey;
          if (mod === "shift") return e.shiftKey;
          if (mod === "alt") return e.altKey;
          return false;
        });

        if (modMatch && e.key.toLowerCase() === shortcut.key.toLowerCase()) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);

  const filtered = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(search.toLowerCase()) ||
      cmd.category?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, typeof commands>>((acc, cmd) => {
    const cat = cmd.category || "Actions";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(cmd);
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setIsOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a]">
          <Search size={14} className="text-[#333]" />
          <input
            type="text"
            placeholder="Type a command..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#333] outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[8px] text-[#444] bg-[#111] border border-[#1a1a1a] rounded font-mono">ESC</kbd>
        </div>

        {/* Command List */}
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <div className="px-4 py-2 text-[9px] uppercase tracking-widest text-[#333]">{category}</div>
              {cmds.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#111] transition-all"
                >
                  <span className="text-xs text-[#888]">{cmd.label}</span>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-[#333] text-xs">No commands found</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#1a1a1a] flex items-center gap-4 text-[8px] text-[#222]">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[#111] border border-[#1a1a1a] rounded font-mono">↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[#111] border border-[#1a1a1a] rounded font-mono">↵</kbd> Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-[#111] border border-[#1a1a1a] rounded font-mono">ESC</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to provide Nexus-specific commands and shortcuts
 */
export function useNexusCommands({
  onNewProject,
  onToggleTemplates,
  onToggleComponents,
  onToggleAnalytics,
  onToggleModelSelector,
  onExport,
}: {
  onNewProject: () => void;
  onToggleTemplates: () => void;
  onToggleComponents: () => void;
  onToggleAnalytics: () => void;
  onToggleModelSelector: () => void;
  onExport: () => void;
}) {
  const shortcuts: Shortcut[] = [
    { key: "n", modifiers: ["ctrl", "shift"], label: "New Project", description: "Start a new build", action: onNewProject },
    { key: "t", modifiers: ["ctrl", "shift"], label: "Templates", description: "Open prompt templates", action: onToggleTemplates },
    { key: "b", modifiers: ["ctrl", "shift"], label: "Components", description: "Open component library", action: onToggleComponents },
    { key: "e", modifiers: ["ctrl", "shift"], label: "Export", description: "Export current project", action: onExport },
  ];

  const commands = [
    { id: "new-project", label: "New Project", action: onNewProject, category: "Project" },
    { id: "templates", label: "Browse Templates", action: onToggleTemplates, category: "Project" },
    { id: "components", label: "Component Library", action: onToggleComponents, category: "Tools" },
    { id: "analytics", label: "Usage Analytics", action: onToggleAnalytics, category: "Tools" },
    { id: "model-select", label: "Configure Models", action: onToggleModelSelector, category: "Settings" },
    { id: "export", label: "Export Project", action: onExport, category: "Project" },
  ];

  return { shortcuts, commands };
}

"use client";

import React, { useState, useEffect, useCallback } from "react";

interface Suggestion {
  id: string;
  type: "component" | "route" | "style" | "fix" | "refactor" | "feature" | "test";
  title: string;
  description: string;
  code?: string;
  file?: string;
  line?: number;
  confidence: number; // 0-1
  impact: "low" | "medium" | "high";
  applied: boolean;
  dismissed: boolean;
}

interface ProjectContext {
  fileCount: number;
  components: string[];
  routes: string[];
  dependencies: string[];
  framework: string;
  recentChanges: Array<{ file: string; action: string; timestamp: string }>;
}

interface ContextAwareSuggestionsProps {
  projectId: string;
  currentFile?: string;
  onApplySuggestion?: (suggestion: Suggestion) => void;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  component: { icon: "🧩", color: "#6366f1", label: "Component" },
  route: { icon: "🔀", color: "#3b82f6", label: "Route" },
  style: { icon: "🎨", color: "#ec4899", label: "Style" },
  fix: { icon: "🐛", color: "#ef4444", label: "Bug Fix" },
  refactor: { icon: "♻️", color: "#f59e0b", label: "Refactor" },
  feature: { icon: "✨", color: "#10b981", label: "Feature" },
  test: { icon: "🧪", color: "#8b5cf6", label: "Test" },
};

const IMPACT_CONFIG = {
  low: { color: "#525252", label: "Low Impact" },
  medium: { color: "#f59e0b", label: "Medium Impact" },
  high: { color: "#10b981", label: "High Impact" },
};

export default function ContextAwareSuggestions({ projectId, currentFile, onApplySuggestion }: ContextAwareSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);

  useEffect(() => {
    analyzeProject();
  }, [projectId]);

  useEffect(() => {
    if (currentFile) fetchFileSuggestions(currentFile);
  }, [currentFile]);

  const analyzeProject = async () => {
    setIsAnalyzing(true);
    try {
      const [ctxRes, sugRes] = await Promise.all([
        fetch(`/api/suggestions/${projectId}/context`),
        fetch(`/api/suggestions/${projectId}`),
      ]);
      if (ctxRes.ok) setProjectContext(await ctxRes.json());
      if (sugRes.ok) setSuggestions(await sugRes.json());
      setLastAnalyzed(new Date().toISOString());
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchFileSuggestions = async (file: string) => {
    try {
      const res = await fetch(`/api/suggestions/${projectId}/file?path=${encodeURIComponent(file)}`);
      if (res.ok) {
        const fileSuggestions = await res.json();
        setSuggestions((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newOnes = fileSuggestions.filter((s: Suggestion) => !existingIds.has(s.id));
          return [...prev, ...newOnes];
        });
      }
    } catch (err) {
      console.error("File suggestions failed:", err);
    }
  };

  const applySuggestion = async (suggestion: Suggestion) => {
    try {
      await fetch(`/api/suggestions/${projectId}/${suggestion.id}/apply`, { method: "POST" });
      setSuggestions((prev) => prev.map((s) => (s.id === suggestion.id ? { ...s, applied: true } : s)));
      onApplySuggestion?.(suggestion);
    } catch (err) {
      console.error("Apply failed:", err);
    }
  };

  const dismissSuggestion = async (id: string) => {
    try {
      await fetch(`/api/suggestions/${projectId}/${id}/dismiss`, { method: "POST" });
      setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, dismissed: true } : s)));
    } catch (err) {
      console.error("Dismiss failed:", err);
    }
  };

  const visible = suggestions
    .filter((s) => showDismissed || !s.dismissed)
    .filter((s) => filterType === "all" || s.type === filterType)
    .sort((a, b) => {
      if (a.applied !== b.applied) return a.applied ? 1 : -1;
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact] || b.confidence - a.confidence;
    });

  const typeGroups = suggestions.reduce((acc, s) => {
    if (!s.dismissed) acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a", color: "#e5e5e5" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🧠</span>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>AI Suggestions</h2>
            <span style={{
              padding: "2px 8px", borderRadius: "8px", fontSize: "11px",
              background: "#6366f120", color: "#6366f1",
            }}>
              {visible.filter((s) => !s.applied).length} active
            </span>
          </div>
          <button
            onClick={analyzeProject}
            disabled={isAnalyzing}
            style={{
              padding: "8px 14px", borderRadius: "8px", border: "none",
              background: isAnalyzing ? "#262626" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: isAnalyzing ? "#525252" : "#fff",
              cursor: isAnalyzing ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 600,
            }}
          >
            {isAnalyzing ? "Analyzing..." : "Re-analyze"}
          </button>
        </div>

        {/* Project Context Summary */}
        {projectContext && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "12px",
          }}>
            {[
              { label: "Files", value: projectContext.fileCount, icon: "📄" },
              { label: "Components", value: projectContext.components.length, icon: "🧩" },
              { label: "Routes", value: projectContext.routes.length, icon: "🔀" },
              { label: "Deps", value: projectContext.dependencies.length, icon: "📦" },
            ].map((stat) => (
              <div key={stat.label} style={{
                padding: "8px 10px", borderRadius: "8px",
                background: "#171717", border: "1px solid #262626",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "14px" }}>{stat.icon}</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#e5e5e5" }}>{stat.value}</div>
                <div style={{ fontSize: "10px", color: "#525252" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Type Filters */}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          <button
            onClick={() => setFilterType("all")}
            style={{
              padding: "4px 10px", borderRadius: "12px", border: "1px solid",
              borderColor: filterType === "all" ? "#6366f1" : "#262626",
              background: filterType === "all" ? "#1e1b4b" : "transparent",
              color: filterType === "all" ? "#a5b4fc" : "#525252",
              cursor: "pointer", fontSize: "11px",
            }}
          >
            All ({suggestions.filter((s) => !s.dismissed).length})
          </button>
          {Object.entries(typeGroups).map(([type, count]) => {
            const config = TYPE_CONFIG[type];
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                style={{
                  padding: "4px 10px", borderRadius: "12px", border: "1px solid",
                  borderColor: filterType === type ? config.color : "#262626",
                  background: filterType === type ? config.color + "15" : "transparent",
                  color: filterType === type ? config.color : "#525252",
                  cursor: "pointer", fontSize: "11px",
                }}
              >
                {config.icon} {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Suggestions List */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 20px" }}>
        {isAnalyzing && suggestions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#525252" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px", animation: "pulse 2s infinite" }}>🧠</div>
            <p>Analyzing your project...</p>
            <p style={{ fontSize: "12px" }}>Understanding structure, patterns, and opportunities</p>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#525252" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>✨</div>
            <p>No suggestions right now</p>
            <p style={{ fontSize: "12px" }}>Make some changes and re-analyze</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {visible.map((suggestion) => {
              const typeConfig = TYPE_CONFIG[suggestion.type] || TYPE_CONFIG.feature;
              const impactConfig = IMPACT_CONFIG[suggestion.impact];
              const isExpanded = expandedId === suggestion.id;

              return (
                <div
                  key={suggestion.id}
                  style={{
                    borderRadius: "10px", border: "1px solid #262626",
                    background: "#171717",
                    opacity: suggestion.applied ? 0.5 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                    style={{
                      padding: "12px 16px", cursor: "pointer",
                      display: "flex", alignItems: "flex-start", gap: "12px",
                    }}
                  >
                    <span style={{ fontSize: "18px", lineHeight: 1 }}>{typeConfig.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600 }}>
                          {suggestion.applied ? "✅ " : ""}{suggestion.title}
                        </span>
                        <span style={{
                          padding: "1px 6px", borderRadius: "8px", fontSize: "10px",
                          background: typeConfig.color + "15", color: typeConfig.color,
                        }}>
                          {typeConfig.label}
                        </span>
                        <span style={{
                          padding: "1px 6px", borderRadius: "8px", fontSize: "10px",
                          background: impactConfig.color + "15", color: impactConfig.color,
                        }}>
                          {impactConfig.label}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#737373", lineHeight: 1.4 }}>
                        {suggestion.description}
                      </div>
                      {suggestion.file && (
                        <div style={{ fontSize: "11px", color: "#6366f1", marginTop: "4px" }}>
                          📎 {suggestion.file}{suggestion.line ? `:${suggestion.line}` : ""}
                        </div>
                      )}
                    </div>
                    <div style={{
                      minWidth: "48px", textAlign: "right",
                      fontSize: "12px", fontWeight: 600,
                      color: suggestion.confidence > 0.8 ? "#10b981" : suggestion.confidence > 0.5 ? "#f59e0b" : "#525252",
                    }}>
                      {Math.round(suggestion.confidence * 100)}%
                    </div>
                  </div>

                  {isExpanded && suggestion.code && (
                    <div style={{ padding: "0 16px 12px" }}>
                      <pre style={{
                        margin: 0, padding: "12px", borderRadius: "8px",
                        background: "#0a0a0a", border: "1px solid #262626",
                        fontSize: "12px", color: "#d4d4d4", whiteSpace: "pre-wrap",
                        maxHeight: "200px", overflow: "auto",
                      }}>
                        {suggestion.code}
                      </pre>
                      {!suggestion.applied && (
                        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); applySuggestion(suggestion); }}
                            style={{
                              padding: "6px 14px", borderRadius: "6px", border: "none",
                              background: "#6366f1", color: "#fff", cursor: "pointer",
                              fontSize: "12px", fontWeight: 600,
                            }}
                          >
                            Apply Suggestion
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); dismissSuggestion(suggestion.id); }}
                            style={{
                              padding: "6px 14px", borderRadius: "6px", border: "1px solid #262626",
                              background: "transparent", color: "#737373", cursor: "pointer", fontSize: "12px",
                            }}
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(suggestion.code || "");
                            }}
                            style={{
                              padding: "6px 14px", borderRadius: "6px", border: "1px solid #262626",
                              background: "transparent", color: "#737373", cursor: "pointer", fontSize: "12px",
                            }}
                          >
                            Copy Code
                          </button>
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

      {/* Footer */}
      <div style={{
        padding: "8px 20px", borderTop: "1px solid #262626",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#525252", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showDismissed}
            onChange={(e) => setShowDismissed(e.target.checked)}
          />
          Show dismissed
        </label>
        {lastAnalyzed && (
          <span style={{ fontSize: "10px", color: "#3f3f46" }}>
            Last analyzed: {new Date(lastAnalyzed).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

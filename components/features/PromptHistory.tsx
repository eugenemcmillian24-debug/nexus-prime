"use client";

import React, { memo, useState, useEffect } from "react";

interface PromptEntry {
  id: string;
  prompt: string;
  response: string;
  model: string;
  templateId?: string;
  templateName?: string;
  tokens: { input: number; output: number; total: number };
  cost: number;
  duration: number; // ms
  rating?: "good" | "bad" | null;
  tags: string[];
  starred: boolean;
  createdAt: string;
}

interface PromptHistoryProps {
  projectId: string;
  onReplayPrompt?: (prompt: string, model: string) => void;
}

const MODEL_COLORS: Record<string, string> = {
  groq: "#f97316",
  gemini: "#3b82f6",
  openrouter: "#8b5cf6",
};

function PromptHistory({ projectId, onReplayPrompt }: PromptHistoryProps) {
  const [entries, setEntries] = useState<PromptEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModel, setFilterModel] = useState<string | null>(null);
  const [filterStarred, setFilterStarred] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "cost" | "tokens">("newest");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [projectId, sortBy]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/prompt-history?projectId=${projectId}&sort=${sortBy}`
      );
      if (res.ok) setEntries(await res.json());
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStar = async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    try {
      await fetch(`/api/prompt-history/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred: !entry.starred }),
      });
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e))
      );
    } catch (err) {
      console.error("Failed to star:", err);
    }
  };

  const rateEntry = async (id: string, rating: "good" | "bad") => {
    try {
      await fetch(`/api/prompt-history/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, rating } : e))
      );
    } catch (err) {
      console.error("Failed to rate:", err);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await fetch(`/api/prompt-history/${id}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const filtered = entries.filter((e) => {
    if (filterModel && e.model !== filterModel) return false;
    if (filterStarred && !e.starred) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.prompt.toLowerCase().includes(q) ||
        e.response.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalTokens = entries.reduce((sum, e) => sum + e.tokens.total, 0);
  const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a", color: "#e5e5e5" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>📜</span>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>Prompt History</h2>
            <span style={{ fontSize: "12px", color: "#525252" }}>{entries.length} prompts</span>
          </div>
          <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#737373" }}>
            <span>{totalTokens.toLocaleString()} tokens</span>
            <span>${totalCost.toFixed(4)} spent</span>
          </div>
        </div>

        {/* Search & Filters */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts, responses, tags..."
              style={{
                width: "100%", padding: "8px 12px 8px 32px", borderRadius: "8px",
                border: "1px solid #262626", background: "#171717",
                color: "#e5e5e5", fontSize: "13px", boxSizing: "border-box",
              }}
            />
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#525252" }}>🔍</span>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            style={{
              padding: "8px 10px", borderRadius: "8px", border: "1px solid #262626",
              background: "#171717", color: "#a3a3a3", fontSize: "12px", cursor: "pointer",
            }}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="cost">Highest Cost</option>
            <option value="tokens">Most Tokens</option>
          </select>

          <button
            onClick={() => setFilterStarred(!filterStarred)}
            style={{
              padding: "8px 12px", borderRadius: "8px", border: "1px solid",
              borderColor: filterStarred ? "#f59e0b" : "#262626",
              background: filterStarred ? "#78350f20" : "transparent",
              color: filterStarred ? "#f59e0b" : "#737373",
              cursor: "pointer", fontSize: "13px",
            }}
          >
            ⭐
          </button>

          {["groq", "gemini", "openrouter"].map((model) => (
            <button
              key={model}
              onClick={() => setFilterModel(filterModel === model ? null : model)}
              style={{
                padding: "4px 10px", borderRadius: "12px", border: "1px solid",
                borderColor: filterModel === model ? MODEL_COLORS[model] : "#262626",
                background: filterModel === model ? MODEL_COLORS[model] + "20" : "transparent",
                color: filterModel === model ? MODEL_COLORS[model] : "#525252",
                cursor: "pointer", fontSize: "11px", textTransform: "capitalize",
              }}
            >
              {model}
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 20px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#525252" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#525252" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>📜</div>
            <p>{searchQuery ? "No matching prompts" : "No prompt history yet"}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.map((entry) => {
              const isExpanded = expandedEntry === entry.id;
              const modelColor = MODEL_COLORS[entry.model] || "#737373";

              return (
                <div
                  key={entry.id}
                  style={{
                    borderRadius: "10px", border: "1px solid #262626",
                    background: "#171717", overflow: "hidden",
                  }}
                >
                  <div
                    onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                    style={{
                      padding: "12px 16px", cursor: "pointer",
                      display: "flex", alignItems: "flex-start", gap: "12px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "4px", lineHeight: 1.4 }}>
                        {entry.prompt.length > 120 ? entry.prompt.slice(0, 120) + "..." : entry.prompt}
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: "10px", fontSize: "10px",
                          background: modelColor + "20", color: modelColor, fontWeight: 600,
                          textTransform: "uppercase",
                        }}>
                          {entry.model}
                        </span>
                        <span style={{ fontSize: "11px", color: "#525252" }}>
                          {entry.tokens.total.toLocaleString()} tokens
                        </span>
                        <span style={{ fontSize: "11px", color: "#525252" }}>
                          {entry.duration}ms
                        </span>
                        {entry.templateName && (
                          <span style={{ fontSize: "11px", color: "#6366f1" }}>📋 {entry.templateName}</span>
                        )}
                        {entry.tags.map((tag) => (
                          <span key={tag} style={{
                            padding: "1px 6px", borderRadius: "8px", fontSize: "10px",
                            background: "#262626", color: "#a3a3a3",
                          }}>
                            {tag}
                          </span>
                        ))}
                        <span style={{ fontSize: "11px", color: "#3f3f46" }}>
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "4px", alignItems: "center", flexShrink: 0 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStar(entry.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", padding: "4px" }}
                      >
                        {entry.starred ? "⭐" : "☆"}
                      </button>
                      <span style={{ color: "#3f3f46", fontSize: "12px", transform: isExpanded ? "rotate(180deg)" : "none", transition: "0.2s" }}>▼</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: "1px solid #262626", padding: "12px 16px" }}>
                      {/* Prompt */}
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ fontSize: "11px", color: "#6366f1", fontWeight: 600, marginBottom: "4px" }}>PROMPT</div>
                        <pre style={{
                          margin: 0, padding: "10px", borderRadius: "6px",
                          background: "#0a0a0a", fontSize: "12px", whiteSpace: "pre-wrap",
                          border: "1px solid #262626", color: "#d4d4d4", maxHeight: "200px", overflow: "auto",
                        }}>
                          {entry.prompt}
                        </pre>
                      </div>

                      {/* Response */}
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ fontSize: "11px", color: "#10b981", fontWeight: 600, marginBottom: "4px" }}>RESPONSE</div>
                        <pre style={{
                          margin: 0, padding: "10px", borderRadius: "6px",
                          background: "#0a0a0a", fontSize: "12px", whiteSpace: "pre-wrap",
                          border: "1px solid #262626", color: "#d4d4d4", maxHeight: "300px", overflow: "auto",
                        }}>
                          {entry.response}
                        </pre>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {onReplayPrompt && (
                          <button
                            onClick={() => onReplayPrompt(entry.prompt, entry.model)}
                            style={{
                              padding: "6px 14px", borderRadius: "6px", border: "none",
                              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                              color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 600,
                            }}
                          >
                            ▶ Replay
                          </button>
                        )}
                        <button
                          onClick={() => navigator.clipboard.writeText(entry.prompt)}
                          style={{
                            padding: "6px 12px", borderRadius: "6px", border: "1px solid #262626",
                            background: "transparent", color: "#a3a3a3", cursor: "pointer", fontSize: "12px",
                          }}
                        >
                          📋 Copy Prompt
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(entry.response)}
                          style={{
                            padding: "6px 12px", borderRadius: "6px", border: "1px solid #262626",
                            background: "transparent", color: "#a3a3a3", cursor: "pointer", fontSize: "12px",
                          }}
                        >
                          📋 Copy Response
                        </button>

                        <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
                          <button
                            onClick={() => rateEntry(entry.id, "good")}
                            style={{
                              padding: "4px 8px", borderRadius: "6px", border: "1px solid",
                              borderColor: entry.rating === "good" ? "#10b981" : "#262626",
                              background: entry.rating === "good" ? "#065f4620" : "transparent",
                              color: entry.rating === "good" ? "#10b981" : "#525252",
                              cursor: "pointer", fontSize: "14px",
                            }}
                          >
                            👍
                          </button>
                          <button
                            onClick={() => rateEntry(entry.id, "bad")}
                            style={{
                              padding: "4px 8px", borderRadius: "6px", border: "1px solid",
                              borderColor: entry.rating === "bad" ? "#ef4444" : "#262626",
                              background: entry.rating === "bad" ? "#7f1d1d20" : "transparent",
                              color: entry.rating === "bad" ? "#ef4444" : "#525252",
                              cursor: "pointer", fontSize: "14px",
                            }}
                          >
                            👎
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            style={{
                              padding: "4px 8px", borderRadius: "6px", border: "1px solid #7f1d1d",
                              background: "transparent", color: "#ef4444",
                              cursor: "pointer", fontSize: "12px",
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
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

export default memo(PromptHistory);

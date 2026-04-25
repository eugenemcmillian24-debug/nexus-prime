"use client";

import React, { useState, useCallback } from "react";

interface ReviewFinding {
  id: string;
  severity: "critical" | "warning" | "info" | "suggestion";
  category: string;
  line?: number;
  endLine?: number;
  message: string;
  suggestion?: string;
  code?: string;
}

interface CodeReview {
  id: string;
  fileId: string;
  filePath: string;
  modelUsed: string;
  reviewType: string;
  findings: ReviewFinding[];
  summary: string;
  score: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
}

interface AICodeReviewProps {
  projectId: string;
  fileId?: string;
  filePath: string;
  code: string;
  language?: string;
  onApplySuggestion?: (finding: ReviewFinding) => void;
}

const REVIEW_TYPES = [
  { id: "general", label: "General Review", icon: "🔍", description: "Overall code quality and structure" },
  { id: "security", label: "Security Audit", icon: "🔒", description: "Vulnerabilities and security issues" },
  { id: "performance", label: "Performance", icon: "⚡", description: "Bottlenecks and optimization opportunities" },
  { id: "accessibility", label: "Accessibility", icon: "♿", description: "WCAG compliance and a11y issues" },
  { id: "best-practices", label: "Best Practices", icon: "✅", description: "Patterns, conventions, and standards" },
];

const SEVERITY_CONFIG = {
  critical: { color: "#ef4444", bg: "#fef2f2", border: "#fecaca", icon: "🔴", label: "Critical" },
  warning: { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", icon: "🟡", label: "Warning" },
  info: { color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", icon: "🔵", label: "Info" },
  suggestion: { color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", icon: "🟢", label: "Suggestion" },
};

export default function AICodeReview({
  projectId,
  fileId,
  filePath,
  code,
  language = "typescript",
  onApplySuggestion,
}: AICodeReviewProps) {
  const [reviews, setReviews] = useState<CodeReview[]>([]);
  const [activeReview, setActiveReview] = useState<CodeReview | null>(null);
  const [selectedType, setSelectedType] = useState("general");
  const [isReviewing, setIsReviewing] = useState(false);
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("qwen-3.6");

  const startReview = useCallback(async () => {
    setIsReviewing(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          fileId,
          filePath,
          code,
          language,
          reviewType: selectedType,
          model: selectedModel,
        }),
      });

      if (!response.ok) throw new Error("Review failed");
      const review: CodeReview = await response.json();
      setReviews((prev) => [review, ...prev]);
      setActiveReview(review);
    } catch (error) {
      // PROD FIX: Removed console.error for production
      // console.error("Review failed:", error);
    } finally {
      setIsReviewing(false);
    }
  }, [projectId, fileId, filePath, code, language, selectedType, selectedModel]);

  const toggleFinding = (id: string) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredFindings = activeReview?.findings.filter(
    (f) => !filterSeverity || f.severity === filterSeverity
  ) || [];

  const severityCounts = activeReview?.findings.reduce(
    (acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] || 0) + 1 }),
    {} as Record<string, number>
  ) || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a", color: "#e5e5e5" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "20px" }}>🔍</span>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>AI Code Review</h2>
            <span style={{ fontSize: "12px", color: "#737373" }}>{filePath}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Model selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{
              background: "#171717", border: "1px solid #262626", borderRadius: "6px",
              color: "#e5e5e5", padding: "6px 10px", fontSize: "13px", cursor: "pointer",
            }}
          >
            <option value="qwen-3.6">Zen Qwen (Fast)</option>
            <option value="kimi-k2.6">Zen Kimi (Balanced)</option>
            <option value="deepseek-v4">Zen DeepSeek (Premium)</option>
          </select>

          {/* Score badge */}
          {activeReview?.score !== undefined && (
            <div style={{
              padding: "4px 12px", borderRadius: "20px", fontSize: "14px", fontWeight: 700,
              background: activeReview.score >= 80 ? "#065f46" : activeReview.score >= 60 ? "#78350f" : "#7f1d1d",
              color: activeReview.score >= 80 ? "#6ee7b7" : activeReview.score >= 60 ? "#fbbf24" : "#fca5a5",
            }}>
              {activeReview.score}/100
            </div>
          )}
        </div>
      </div>

      {/* Review Type Selector */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #262626", display: "flex", gap: "8px", overflowX: "auto" }}>
        {REVIEW_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            style={{
              padding: "8px 14px", borderRadius: "8px", border: "1px solid",
              borderColor: selectedType === type.id ? "#6366f1" : "#262626",
              background: selectedType === type.id ? "#1e1b4b" : "#171717",
              color: selectedType === type.id ? "#a5b4fc" : "#a3a3a3",
              cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s",
            }}
            title={type.description}
          >
            <span>{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>

      {/* Action bar */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #262626", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={startReview}
          disabled={isReviewing || !code.trim()}
          style={{
            padding: "10px 24px", borderRadius: "8px", border: "none",
            background: isReviewing ? "#262626" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: isReviewing ? "#737373" : "#fff",
            cursor: isReviewing ? "not-allowed" : "pointer",
            fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px",
          }}
        >
          {isReviewing ? (
            <>
              <span className="animate-spin" style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
              Analyzing...
            </>
          ) : (
            <>🔍 Start Review</>
          )}
        </button>

        {/* Severity filter pills */}
        {activeReview && (
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => setFilterSeverity(null)}
              style={{
                padding: "4px 10px", borderRadius: "12px", fontSize: "12px", border: "1px solid",
                borderColor: !filterSeverity ? "#6366f1" : "#262626",
                background: !filterSeverity ? "#1e1b4b" : "transparent",
                color: !filterSeverity ? "#a5b4fc" : "#737373", cursor: "pointer",
              }}
            >
              All ({activeReview.findings.length})
            </button>
            {Object.entries(SEVERITY_CONFIG).map(([key, config]) => {
              const count = severityCounts[key] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setFilterSeverity(filterSeverity === key ? null : key)}
                  style={{
                    padding: "4px 10px", borderRadius: "12px", fontSize: "12px", border: "1px solid",
                    borderColor: filterSeverity === key ? config.color : "#262626",
                    background: filterSeverity === key ? config.bg + "20" : "transparent",
                    color: filterSeverity === key ? config.color : "#737373", cursor: "pointer",
                  }}
                >
                  {config.icon} {count}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
        {!activeReview && !isReviewing && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#525252" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
            <p style={{ fontSize: "16px", marginBottom: "8px" }}>No review yet</p>
            <p style={{ fontSize: "13px" }}>Select a review type and click &quot;Start Review&quot; to analyze your code</p>
          </div>
        )}

        {isReviewing && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px", animation: "pulse 2s infinite" }}>🤖</div>
            <p style={{ fontSize: "16px", color: "#a5b4fc", marginBottom: "8px" }}>AI is reviewing your code...</p>
            <p style={{ fontSize: "13px", color: "#525252" }}>
              Running {REVIEW_TYPES.find((t) => t.id === selectedType)?.label} with {selectedModel}
            </p>
          </div>
        )}

        {/* Summary */}
        {activeReview && !isReviewing && (
          <>
            <div style={{
              padding: "16px", borderRadius: "10px", border: "1px solid #262626",
              background: "#171717", marginBottom: "16px",
            }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 600, color: "#a5b4fc" }}>Summary</h3>
              <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6, color: "#d4d4d4" }}>
                {activeReview.summary || "Review completed."}
              </p>
            </div>

            {/* Findings list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredFindings.map((finding) => {
                const config = SEVERITY_CONFIG[finding.severity];
                const isExpanded = expandedFindings.has(finding.id);

                return (
                  <div
                    key={finding.id}
                    style={{
                      borderRadius: "10px", border: `1px solid ${config.border}20`,
                      background: "#171717", overflow: "hidden",
                    }}
                  >
                    <button
                      onClick={() => toggleFinding(finding.id)}
                      style={{
                        width: "100%", padding: "12px 16px", background: "none", border: "none",
                        color: "#e5e5e5", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px",
                        textAlign: "left",
                      }}
                    >
                      <span>{config.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: 500 }}>{finding.message}</div>
                        <div style={{ fontSize: "11px", color: "#737373", marginTop: "2px" }}>
                          {finding.category}
                          {finding.line && ` · Line ${finding.line}${finding.endLine ? `-${finding.endLine}` : ""}`}
                        </div>
                      </div>
                      <span style={{ color: "#525252", fontSize: "12px", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
                    </button>

                    {isExpanded && (
                      <div style={{ padding: "0 16px 12px", borderTop: "1px solid #262626" }}>
                        {finding.code && (
                          <pre style={{
                            margin: "12px 0", padding: "10px", borderRadius: "6px",
                            background: "#0a0a0a", fontSize: "12px", overflow: "auto",
                            border: "1px solid #262626", color: "#d4d4d4",
                          }}>
                            <code>{finding.code}</code>
                          </pre>
                        )}
                        {finding.suggestion && (
                          <div style={{ marginTop: "8px" }}>
                            <div style={{ fontSize: "12px", color: "#10b981", fontWeight: 500, marginBottom: "6px" }}>
                              💡 Suggestion
                            </div>
                            <pre style={{
                              margin: 0, padding: "10px", borderRadius: "6px",
                              background: "#052e16", fontSize: "12px", overflow: "auto",
                              border: "1px solid #065f46", color: "#6ee7b7",
                            }}>
                              <code>{finding.suggestion}</code>
                            </pre>
                            {onApplySuggestion && (
                              <button
                                onClick={() => onApplySuggestion(finding)}
                                style={{
                                  marginTop: "8px", padding: "6px 12px", borderRadius: "6px",
                                  border: "1px solid #065f46", background: "#052e16",
                                  color: "#6ee7b7", fontSize: "12px", cursor: "pointer",
                                }}
                              >
                                Apply Suggestion
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Review history */}
            {reviews.length > 1 && (
              <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #262626" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600, color: "#737373" }}>Review History</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {reviews.map((review) => (
                    <button
                      key={review.id}
                      onClick={() => setActiveReview(review)}
                      style={{
                        padding: "8px 12px", borderRadius: "8px", border: "1px solid",
                        borderColor: activeReview?.id === review.id ? "#6366f1" : "#262626",
                        background: activeReview?.id === review.id ? "#1e1b4b" : "#171717",
                        color: "#d4d4d4", cursor: "pointer", textAlign: "left",
                        display: "flex", justifyContent: "space-between", fontSize: "12px",
                      }}
                    >
                      <span>{REVIEW_TYPES.find((t) => t.id === review.reviewType)?.icon} {review.reviewType}</span>
                      <span style={{ color: "#525252" }}>{new Date(review.createdAt).toLocaleTimeString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

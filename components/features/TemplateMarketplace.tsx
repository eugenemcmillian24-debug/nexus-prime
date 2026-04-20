"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: { id: string; name: string; avatar?: string };
  prompt: string;
  variables: Array<{ name: string; description: string; default?: string }>;
  downloads: number;
  likes: number;
  isLiked: boolean;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TemplateMarketplaceProps {
  userId: string;
  onImportTemplate?: (template: MarketplaceTemplate) => void;
}

const CATEGORIES = [
  { id: "all", label: "All", icon: "🌐" },
  { id: "coding", label: "Coding", icon: "💻" },
  { id: "writing", label: "Writing", icon: "✍️" },
  { id: "design", label: "Design", icon: "🎨" },
  { id: "analysis", label: "Analysis", icon: "📊" },
  { id: "devops", label: "DevOps", icon: "🔧" },
  { id: "testing", label: "Testing", icon: "🧪" },
  { id: "docs", label: "Documentation", icon: "📝" },
];

const SORT_OPTIONS = [
  { id: "popular", label: "Most Popular" },
  { id: "newest", label: "Newest" },
  { id: "top-rated", label: "Top Rated" },
  { id: "most-downloaded", label: "Most Downloaded" },
];

export default function TemplateMarketplace({ userId, onImportTemplate }: TemplateMarketplaceProps) {
  const supabase = createClient();
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [activeView, setActiveTab] = useState<'browse' | 'seller'>('browse');
  const [sellerStats, setSellerStats] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [publishForm, setPublishForm] = useState({
    name: "", description: "", category: "coding", tags: "", prompt: "",
    variables: [] as Array<{ name: string; description: string; default: string }>,
  });

  useEffect(() => {
    const fetchAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: creditData } = await supabase.from('user_credits').select('*').eq('user_id', session.user.id).single();
        setCredits(creditData);
        setIsAdmin(session.user.email === 'admin@nexus-prime.ai'); // Simplified check for now
      }
    };
    fetchAccess();
    if (activeView === 'browse') {
      fetchTemplates();
    } else {
      fetchSellerStats();
    }
  }, [activeCategory, sortBy, activeView]);

  const fetchSellerStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/marketplace/stats");
      if (res.ok) setSellerStats(await res.json());
    } catch (e) {}
    finally { setIsLoading(false); }
  };

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ sort: sortBy });
      if (activeCategory !== "all") params.set("category", activeCategory);
      if (searchQuery) params.set("q", searchQuery);
      const res = await fetch(`/api/marketplace/templates?${params}`);
      if (res.ok) setTemplates(await res.json());
    } catch (err) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to fetch marketplace:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const likeTemplate = async (id: string) => {
    try {
      await fetch(`/api/marketplace/templates/${id}/like`, { method: "POST" });
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, isLiked: !t.isLiked, likes: t.isLiked ? t.likes - 1 : t.likes + 1 }
            : t
        )
      );
      if (selectedTemplate?.id === id) {
        setSelectedTemplate((prev) =>
          prev ? { ...prev, isLiked: !prev.isLiked, likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1 } : null
        );
      }
    } catch (err) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to like:", err);
    }
  };

  const importTemplate = async (template: MarketplaceTemplate) => {
    try {
      await fetch("/api/marketplace/templates/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id }),
      });
      onImportTemplate?.(template);
      setSelectedTemplate(null);
    } catch (err) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to import:", err);
    }
  };

  const publishTemplate = async () => {
    try {
      await fetch("/api/marketplace/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...publishForm,
          tags: publishForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      setShowPublish(false);
      setPublishForm({ name: "", description: "", category: "coding", tags: "", prompt: "", variables: [] });
      fetchTemplates();
    } catch (err) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to publish:", err);
    }
  };

  const filtered = templates.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a", color: "#e5e5e5" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🏪</span>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>Template Marketplace</h2>
            <div style={{ display: "flex", gap: "8px", marginLeft: "12px", borderLeft: "1px solid #262626", paddingLeft: "12px" }}>
                <button
                  onClick={() => setActiveTab('browse')}
                  style={{
                    fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em",
                    color: activeView === 'browse' ? "#00ff88" : "#444", background: "none", border: "none", cursor: "pointer"
                  }}
                >
                  [ BROWSE ]
                </button>
                {(isAdmin || credits?.tier === 'PRO' || credits?.tier === 'Enterprise') && (
                  <button
                    onClick={() => setActiveTab('seller')}
                    style={{
                      fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em",
                      color: activeView === 'seller' ? "#00ff88" : "#444", background: "none", border: "none", cursor: "pointer"
                    }}
                  >
                    [ SELLER HUB ]
                  </button>
                )}

            </div>
          </div>
          <button
            onClick={() => setShowPublish(!showPublish)}
            style={{
              padding: "8px 14px", borderRadius: "8px", border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 600,
            }}
          >
            Publish Template
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: "12px" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchTemplates()}
            placeholder="Search templates, tags, authors..."
            style={{
              width: "100%", padding: "10px 14px 10px 36px", borderRadius: "10px",
              border: "1px solid #262626", background: "#171717",
              color: "#e5e5e5", fontSize: "13px", boxSizing: "border-box",
            }}
          />
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#525252" }}>🔍</span>
        </div>

        {/* Categories */}
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: "6px 12px", borderRadius: "16px", border: "1px solid",
                borderColor: activeCategory === cat.id ? "#6366f1" : "#262626",
                background: activeCategory === cat.id ? "#1e1b4b" : "transparent",
                color: activeCategory === cat.id ? "#a5b4fc" : "#737373",
                cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: "4px",
              }}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort bar */}
      <div style={{ padding: "8px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              style={{
                padding: "4px 10px", borderRadius: "6px", border: "none",
                background: sortBy === opt.id ? "#262626" : "transparent",
                color: sortBy === opt.id ? "#e5e5e5" : "#525252",
                cursor: "pointer", fontSize: "11px",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: "11px", color: "#3f3f46" }}>{filtered.length} results</span>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
        {activeView === 'browse' ? (
          <>
            {isLoading ? (
              <div style={{ textAlign: "center", padding: "60px", color: "#525252" }}>Loading marketplace...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px", color: "#525252" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>🏪</div>
                <p>No templates found</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
                {filtered.map((template) => {
                  const cat = CATEGORIES.find((c) => c.id === template.category);
                  return (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      style={{
                        padding: "16px", borderRadius: "12px",
                        border: "1px solid #262626", background: "#171717",
                        cursor: "pointer", transition: "border-color 0.15s",
                        position: "relative",
                      }}
                    >
                      {template.isFeatured && (
                        <div style={{
                          position: "absolute", top: "8px", right: "8px",
                          padding: "2px 8px", borderRadius: "8px",
                          background: "#f59e0b20", color: "#f59e0b",
                          fontSize: "10px", fontWeight: 600,
                        }}>
                          ⭐ Featured
                        </div>
                      )}
                      <div style={{ marginBottom: "8px" }}>
                        <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>{template.name}</div>
                        <div style={{ fontSize: "12px", color: "#737373", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {template.description}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: "8px", fontSize: "10px",
                          background: "#6366f120", color: "#6366f1",
                        }}>
                          {cat?.icon} {template.category}
                        </span>
                        {template.tags.slice(0, 3).map((tag) => (
                          <span key={tag} style={{
                            padding: "2px 6px", borderRadius: "8px", fontSize: "10px",
                            background: "#262626", color: "#a3a3a3",
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#525252" }}>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <span>⬇ {template.downloads.toLocaleString()}</span>
                          <span style={{ color: template.isLiked ? "#ef4444" : "#525252" }}>
                            {template.isLiked ? "❤️" : "♡"} {template.likes}
                          </span>
                          <span>⭐ {template.rating.toFixed(1)}</span>
                        </div>
                        <span>by {template.author.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* SELLER HUB VIEW */
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {isLoading ? (
                <div style={{ textAlign: "center", padding: "60px" }}>Analyzing Seller Sequence...</div>
            ) : !sellerStats ? (
                <div style={{ textAlign: "center", padding: "60px" }}>No seller data found.</div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                        {[
                            { label: "Total Earnings", value: `${sellerStats.summary.totalEarnings} CR`, icon: "💰" },
                            { label: "Total Sales", value: sellerStats.summary.totalSales, icon: "📈" },
                            { label: "Listed Modules", value: sellerStats.summary.listedModules, icon: "📦" },
                            { label: "Avg Rating", value: sellerStats.summary.averageRating, icon: "⭐" },
                        ].map((stat) => (
                            <div key={stat.label} style={{ padding: "20px", background: "#111", border: "1px solid #1a1a1a", borderRadius: "8px" }}>
                                <div style={{ fontSize: "10px", color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>{stat.label}</div>
                                <div style={{ fontSize: "18px", fontWeight: 700, color: "#fff" }}>{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: "24px" }}>
                        <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "12px" }}>Active Inventory</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {sellerStats.modules.map((m: any) => (
                                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: "4px" }}>
                                    <div>
                                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#eee" }}>{m.name}</div>
                                        <div style={{ fontSize: "10px", color: "#333", textTransform: "uppercase" }}>Price: {m.price} CR · {m.usage_count} installs</div>
                                    </div>
                                    <div style={{ color: "#00ff88", fontSize: "11px", fontWeight: 700 }}>ACTIVE</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div style={{
          position: "fixed", inset: 0, background: "#000000cc",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "20px",
        }}
          onClick={() => setSelectedTemplate(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "640px", maxHeight: "80vh", overflow: "auto",
              borderRadius: "16px", border: "1px solid #262626",
              background: "#0a0a0a", padding: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px" }}>{selectedTemplate.name}</h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#737373" }}>by {selectedTemplate.author.name}</p>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                style={{ background: "none", border: "none", color: "#525252", cursor: "pointer", fontSize: "18px" }}
              >✕</button>
            </div>

            <p style={{ fontSize: "14px", color: "#a3a3a3", lineHeight: 1.5, margin: "0 0 16px" }}>
              {selectedTemplate.description}
            </p>

            <div style={{ display: "flex", gap: "16px", marginBottom: "16px", fontSize: "13px", color: "#737373" }}>
              <span>⬇ {selectedTemplate.downloads.toLocaleString()} downloads</span>
              <span>❤️ {selectedTemplate.likes} likes</span>
              <span>⭐ {selectedTemplate.rating.toFixed(1)} ({selectedTemplate.reviewCount} reviews)</span>
            </div>

            {/* Prompt preview */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: "#6366f1", fontWeight: 600, display: "block", marginBottom: "4px" }}>PROMPT</label>
              <pre style={{
                margin: 0, padding: "12px", borderRadius: "8px",
                background: "#171717", border: "1px solid #262626",
                fontSize: "12px", color: "#d4d4d4", whiteSpace: "pre-wrap",
                maxHeight: "200px", overflow: "auto",
              }}>
                {selectedTemplate.prompt}
              </pre>
            </div>

            {/* Variables */}
            {selectedTemplate.variables.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "#10b981", fontWeight: 600, display: "block", marginBottom: "4px" }}>VARIABLES</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {selectedTemplate.variables.map((v) => (
                    <div key={v.name} style={{
                      padding: "8px 12px", borderRadius: "8px",
                      background: "#171717", border: "1px solid #262626",
                      display: "flex", justifyContent: "space-between",
                    }}>
                      <div>
                        <code style={{ color: "#10b981", fontSize: "12px" }}>{`{{${v.name}}}`}</code>
                        <span style={{ fontSize: "12px", color: "#737373", marginLeft: "8px" }}>{v.description}</span>
                      </div>
                      {v.default && (
                        <span style={{ fontSize: "11px", color: "#525252" }}>default: {v.default}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => importTemplate(selectedTemplate)}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px", border: "none",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 600,
                }}
              >
                Import to My Templates
              </button>
              <button
                onClick={() => likeTemplate(selectedTemplate.id)}
                style={{
                  padding: "10px 16px", borderRadius: "8px", border: "1px solid #262626",
                  background: selectedTemplate.isLiked ? "#7f1d1d20" : "transparent",
                  color: selectedTemplate.isLiked ? "#ef4444" : "#737373",
                  cursor: "pointer", fontSize: "14px",
                }}
              >
                {selectedTemplate.isLiked ? "❤️" : "♡"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublish && (
        <div style={{
          position: "fixed", inset: 0, background: "#000000cc",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "20px",
        }}
          onClick={() => setShowPublish(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "560px", maxHeight: "80vh", overflow: "auto",
              borderRadius: "16px", border: "1px solid #262626",
              background: "#0a0a0a", padding: "24px",
            }}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: "18px" }}>Publish Template</h3>

            {[
              { label: "Name", value: publishForm.name, key: "name" as const, placeholder: "e.g., React Component Generator" },
              { label: "Description", value: publishForm.description, key: "description" as const, placeholder: "What does this template do?" },
              { label: "Tags (comma-separated)", value: publishForm.tags, key: "tags" as const, placeholder: "react, typescript, components" },
            ].map((field) => (
              <div key={field.key} style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#a3a3a3", marginBottom: "4px" }}>{field.label}</label>
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => setPublishForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: "8px",
                    border: "1px solid #262626", background: "#171717",
                    color: "#e5e5e5", fontSize: "13px", boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#a3a3a3", marginBottom: "4px" }}>Category</label>
              <select
                value={publishForm.category}
                onChange={(e) => setPublishForm((prev) => ({ ...prev, category: e.target.value }))}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "8px",
                  border: "1px solid #262626", background: "#171717",
                  color: "#e5e5e5", fontSize: "13px", cursor: "pointer",
                }}
              >
                {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#a3a3a3", marginBottom: "4px" }}>Prompt Template</label>
              <textarea
                value={publishForm.prompt}
                onChange={(e) => setPublishForm((prev) => ({ ...prev, prompt: e.target.value }))}
                placeholder="Enter your prompt template. Use {{variable_name}} for variables."
                rows={6}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "8px",
                  border: "1px solid #262626", background: "#171717",
                  color: "#e5e5e5", fontSize: "13px", resize: "vertical",
                  fontFamily: "monospace", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={publishTemplate}
                disabled={!publishForm.name || !publishForm.prompt}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px", border: "none",
                  background: publishForm.name && publishForm.prompt ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#262626",
                  color: publishForm.name && publishForm.prompt ? "#fff" : "#525252",
                  cursor: publishForm.name && publishForm.prompt ? "pointer" : "not-allowed",
                  fontSize: "14px", fontWeight: 600,
                }}
              >
                Publish
              </button>
              <button onClick={() => setShowPublish(false)} style={{
                padding: "10px 16px", borderRadius: "8px", border: "1px solid #262626",
                background: "transparent", color: "#737373", cursor: "pointer", fontSize: "13px",
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

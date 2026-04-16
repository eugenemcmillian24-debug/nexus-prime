"use client";

import React, { useState, useEffect } from "react";

interface WebhookConfig {
  id: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  lastTriggered?: string;
  lastStatus?: number;
  deliveryCount: number;
  failureCount: number;
  createdAt: string;
}

interface ApiToken {
  id: string;
  name: string;
  tokenPreview: string;
  scopes: string[];
  lastUsed?: string;
  expiresAt?: string;
  requestCount: number;
  createdAt: string;
}

interface WebhooksApiAccessProps {
  projectId: string;
}

const WEBHOOK_EVENTS = [
  { id: "project.deploy", label: "Deployment completed", icon: "🚀" },
  { id: "project.build_failed", label: "Build failed", icon: "❌" },
  { id: "project.file_changed", label: "File changed", icon: "📝" },
  { id: "project.version_created", label: "Version created", icon: "📸" },
  { id: "code_review.completed", label: "Code review completed", icon: "🔍" },
  { id: "team.member_joined", label: "Team member joined", icon: "👤" },
  { id: "team.member_left", label: "Team member left", icon: "👋" },
  { id: "prompt.completed", label: "Prompt completed", icon: "🤖" },
  { id: "component.published", label: "Component published", icon: "🧩" },
  { id: "domain.verified", label: "Domain verified", icon: "🌐" },
];

const API_SCOPES = [
  { id: "project:read", label: "Read project data", description: "View project files, settings, and metadata" },
  { id: "project:write", label: "Write project data", description: "Create, update, delete project files" },
  { id: "deploy:read", label: "Read deployments", description: "View deployment status and history" },
  { id: "deploy:write", label: "Trigger deployments", description: "Start new deployments" },
  { id: "prompt:read", label: "Read prompts", description: "Access prompt history and templates" },
  { id: "prompt:write", label: "Execute prompts", description: "Run AI prompts via API" },
  { id: "team:read", label: "Read team data", description: "View team members and roles" },
  { id: "team:write", label: "Manage team", description: "Invite, remove, update team members" },
  { id: "webhook:manage", label: "Manage webhooks", description: "Create, update, delete webhooks" },
];

export default function WebhooksApiAccess({ projectId }: WebhooksApiAccessProps) {
  const [activeTab, setActiveTab] = useState<"webhooks" | "api-tokens" | "docs">("webhooks");
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Webhook form
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);

  // Token form
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [tokenScopes, setTokenScopes] = useState<string[]>([]);
  const [tokenExpiry, setTokenExpiry] = useState("30");
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [whRes, tkRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/webhooks`),
        fetch(`/api/projects/${projectId}/tokens`),
      ]);
      if (whRes.ok) setWebhooks(await whRes.json());
      if (tkRes.ok) setTokens(await tkRes.json());
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const createWebhook = async () => {
    if (!webhookUrl.trim() || webhookEvents.length === 0) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl, events: webhookEvents }),
      });
      if (res.ok) {
        const webhook = await res.json();
        setWebhooks((prev) => [webhook, ...prev]);
        setWebhookUrl("");
        setWebhookEvents([]);
        setShowWebhookForm(false);
      }
    } catch (err) {
      console.error("Create webhook failed:", err);
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      await fetch(`/api/projects/${projectId}/webhooks/${id}`, { method: "DELETE" });
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error("Delete webhook failed:", err);
    }
  };

  const toggleWebhook = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/projects/${projectId}/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      setWebhooks((prev) =>
        prev.map((w) => (w.id === id ? { ...w, isActive: !isActive } : w))
      );
    } catch (err) {
      console.error("Toggle webhook failed:", err);
    }
  };

  const createToken = async () => {
    if (!tokenName.trim() || tokenScopes.length === 0) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tokenName,
          scopes: tokenScopes,
          expiresInDays: parseInt(tokenExpiry),
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setNewTokenValue(result.token); // Show the full token ONCE
        setTokens((prev) => [result.tokenMeta, ...prev]);
        setTokenName("");
        setTokenScopes([]);
      }
    } catch (err) {
      console.error("Create token failed:", err);
    }
  };

  const revokeToken = async (id: string) => {
    if (!confirm("Revoke this API token? Any integrations using it will stop working.")) return;
    try {
      await fetch(`/api/projects/${projectId}/tokens/${id}`, { method: "DELETE" });
      setTokens((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Revoke failed:", err);
    }
  };

  const toggleEvent = (eventId: string) => {
    setWebhookEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    );
  };

  const toggleScope = (scopeId: string) => {
    setTokenScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a", color: "#e5e5e5" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ fontSize: "20px" }}>🔌</span>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>Webhooks & API</h2>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["webhooks", "api-tokens", "docs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 16px", borderRadius: "8px", border: "none",
                background: activeTab === tab ? "#1e1b4b" : "transparent",
                color: activeTab === tab ? "#a5b4fc" : "#525252",
                cursor: "pointer", fontSize: "13px", fontWeight: activeTab === tab ? 600 : 400,
                textTransform: "capitalize",
              }}
            >
              {tab.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
        {/* Webhooks Tab */}
        {activeTab === "webhooks" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ fontSize: "13px", color: "#737373" }}>
                {webhooks.length} webhook{webhooks.length !== 1 ? "s" : ""} configured
              </span>
              <button
                onClick={() => setShowWebhookForm(!showWebhookForm)}
                style={{
                  padding: "6px 12px", borderRadius: "6px", border: "none",
                  background: "#6366f1", color: "#fff", cursor: "pointer", fontSize: "12px",
                }}
              >
                + Add Webhook
              </button>
            </div>

            {showWebhookForm && (
              <div style={{
                padding: "16px", borderRadius: "10px", border: "1px solid #262626",
                background: "#171717", marginBottom: "16px",
              }}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#a3a3a3", marginBottom: "4px" }}>Endpoint URL</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-server.com/webhook"
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: "8px",
                      border: "1px solid #262626", background: "#0a0a0a",
                      color: "#e5e5e5", fontSize: "13px", fontFamily: "monospace", boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#a3a3a3", marginBottom: "8px" }}>Events</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    {WEBHOOK_EVENTS.map((event) => (
                      <label
                        key={event.id}
                        style={{
                          display: "flex", alignItems: "center", gap: "8px",
                          padding: "6px 10px", borderRadius: "6px",
                          background: webhookEvents.includes(event.id) ? "#6366f110" : "transparent",
                          border: `1px solid ${webhookEvents.includes(event.id) ? "#6366f1" : "#262626"}`,
                          cursor: "pointer", fontSize: "12px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={webhookEvents.includes(event.id)}
                          onChange={() => toggleEvent(event.id)}
                        />
                        <span>{event.icon}</span> {event.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={createWebhook} disabled={!webhookUrl || webhookEvents.length === 0} style={{
                    padding: "8px 16px", borderRadius: "8px", border: "none",
                    background: webhookUrl && webhookEvents.length > 0 ? "#6366f1" : "#262626",
                    color: webhookUrl && webhookEvents.length > 0 ? "#fff" : "#525252",
                    cursor: webhookUrl && webhookEvents.length > 0 ? "pointer" : "not-allowed",
                    fontSize: "13px", fontWeight: 600,
                  }}>
                    Create Webhook
                  </button>
                  <button onClick={() => setShowWebhookForm(false)} style={{
                    padding: "8px 16px", borderRadius: "8px", border: "1px solid #262626",
                    background: "transparent", color: "#737373", cursor: "pointer", fontSize: "13px",
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {webhooks.map((webhook) => (
              <div key={webhook.id} style={{
                padding: "14px 16px", borderRadius: "10px", border: "1px solid #262626",
                background: "#171717", marginBottom: "8px", opacity: webhook.isActive ? 1 : 0.5,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <code style={{ fontSize: "13px", color: "#e5e5e5" }}>{webhook.url}</code>
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                      {webhook.events.map((e) => {
                        const ev = WEBHOOK_EVENTS.find((we) => we.id === e);
                        return (
                          <span key={e} style={{
                            padding: "1px 6px", borderRadius: "8px", fontSize: "10px",
                            background: "#262626", color: "#a3a3a3",
                          }}>
                            {ev?.icon} {e.split(".")[1]}
                          </span>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: "11px", color: "#3f3f46", marginTop: "4px" }}>
                      {webhook.deliveryCount} deliveries · {webhook.failureCount} failures
                      {webhook.lastTriggered && ` · Last: ${new Date(webhook.lastTriggered).toLocaleDateString()}`}
                      {webhook.lastStatus && ` · ${webhook.lastStatus}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button onClick={() => toggleWebhook(webhook.id, webhook.isActive)} style={{
                      padding: "4px 8px", borderRadius: "4px", border: "1px solid #262626",
                      background: "transparent", color: webhook.isActive ? "#f59e0b" : "#10b981",
                      cursor: "pointer", fontSize: "11px",
                    }}>
                      {webhook.isActive ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => deleteWebhook(webhook.id)} style={{
                      padding: "4px 8px", borderRadius: "4px", border: "1px solid #7f1d1d",
                      background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: "11px",
                    }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API Tokens Tab */}
        {activeTab === "api-tokens" && (
          <div>
            {/* New token reveal */}
            {newTokenValue && (
              <div style={{
                padding: "14px 16px", borderRadius: "10px",
                border: "1px solid #10b981", background: "#10b98110",
                marginBottom: "16px",
              }}>
                <div style={{ fontSize: "12px", color: "#10b981", fontWeight: 600, marginBottom: "6px" }}>
                  ✅ Token created! Copy it now — you won't see it again.
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <code style={{
                    flex: 1, padding: "8px", borderRadius: "6px",
                    background: "#0a0a0a", fontSize: "12px", color: "#e5e5e5",
                    wordBreak: "break-all",
                  }}>
                    {newTokenValue}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(newTokenValue); }}
                    style={{
                      padding: "6px 12px", borderRadius: "6px", border: "none",
                      background: "#10b981", color: "#fff", cursor: "pointer", fontSize: "12px",
                    }}
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => setNewTokenValue(null)}
                    style={{
                      padding: "6px 12px", borderRadius: "6px", border: "1px solid #262626",
                      background: "transparent", color: "#737373", cursor: "pointer", fontSize: "12px",
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ fontSize: "13px", color: "#737373" }}>{tokens.length} API token{tokens.length !== 1 ? "s" : ""}</span>
              <button onClick={() => setShowTokenForm(!showTokenForm)} style={{
                padding: "6px 12px", borderRadius: "6px", border: "none",
                background: "#6366f1", color: "#fff", cursor: "pointer", fontSize: "12px",
              }}>
                + Generate Token
              </button>
            </div>

            {showTokenForm && (
              <div style={{
                padding: "16px", borderRadius: "10px", border: "1px solid #262626",
                background: "#171717", marginBottom: "16px",
              }}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#a3a3a3", marginBottom: "4px" }}>Token Name</label>
                  <input
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="e.g., CI/CD Pipeline, Mobile App"
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: "8px",
                      border: "1px solid #262626", background: "#0a0a0a",
                      color: "#e5e5e5", fontSize: "13px", boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#a3a3a3", marginBottom: "4px" }}>Expiry</label>
                  <select
                    value={tokenExpiry}
                    onChange={(e) => setTokenExpiry(e.target.value)}
                    style={{
                      padding: "10px 14px", borderRadius: "8px",
                      border: "1px solid #262626", background: "#0a0a0a",
                      color: "#e5e5e5", fontSize: "13px", cursor: "pointer",
                    }}
                  >
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                    <option value="0">Never</option>
                  </select>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#a3a3a3", marginBottom: "8px" }}>Scopes</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {API_SCOPES.map((scope) => (
                      <label
                        key={scope.id}
                        style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          padding: "8px 12px", borderRadius: "8px",
                          background: tokenScopes.includes(scope.id) ? "#6366f110" : "transparent",
                          border: `1px solid ${tokenScopes.includes(scope.id) ? "#6366f1" : "#262626"}`,
                          cursor: "pointer",
                        }}
                      >
                        <input type="checkbox" checked={tokenScopes.includes(scope.id)} onChange={() => toggleScope(scope.id)} />
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 500 }}>{scope.label}</div>
                          <div style={{ fontSize: "11px", color: "#525252" }}>{scope.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={createToken} disabled={!tokenName || tokenScopes.length === 0} style={{
                    padding: "8px 16px", borderRadius: "8px", border: "none",
                    background: tokenName && tokenScopes.length > 0 ? "#6366f1" : "#262626",
                    color: tokenName && tokenScopes.length > 0 ? "#fff" : "#525252",
                    cursor: tokenName && tokenScopes.length > 0 ? "pointer" : "not-allowed",
                    fontSize: "13px", fontWeight: 600,
                  }}>
                    Generate Token
                  </button>
                  <button onClick={() => setShowTokenForm(false)} style={{
                    padding: "8px 16px", borderRadius: "8px", border: "1px solid #262626",
                    background: "transparent", color: "#737373", cursor: "pointer", fontSize: "13px",
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {tokens.map((token) => (
              <div key={token.id} style={{
                padding: "14px 16px", borderRadius: "10px", border: "1px solid #262626",
                background: "#171717", marginBottom: "8px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "18px" }}>🔐</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>{token.name}</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                      <code style={{ fontSize: "11px", color: "#525252", background: "#0a0a0a", padding: "1px 6px", borderRadius: "4px" }}>
                        {token.tokenPreview}
                      </code>
                      {token.scopes.map((s) => (
                        <span key={s} style={{ padding: "1px 6px", borderRadius: "8px", fontSize: "10px", background: "#262626", color: "#a3a3a3" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: "11px", color: "#3f3f46", marginTop: "4px" }}>
                      {token.requestCount.toLocaleString()} requests
                      {token.lastUsed && ` · Last: ${new Date(token.lastUsed).toLocaleDateString()}`}
                      {token.expiresAt && ` · Expires: ${new Date(token.expiresAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <button onClick={() => revokeToken(token.id)} style={{
                    padding: "4px 8px", borderRadius: "4px", border: "1px solid #7f1d1d",
                    background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: "11px",
                  }}>
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API Docs Tab */}
        {activeTab === "docs" && (
          <div>
            <div style={{
              padding: "16px", borderRadius: "10px",
              background: "#171717", border: "1px solid #262626", marginBottom: "16px",
            }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "14px" }}>Base URL</h3>
              <code style={{
                display: "block", padding: "10px", borderRadius: "8px",
                background: "#0a0a0a", fontSize: "13px", color: "#6366f1",
              }}>
                https://api.nexusprime.app/v1
              </code>
            </div>

            <div style={{
              padding: "16px", borderRadius: "10px",
              background: "#171717", border: "1px solid #262626", marginBottom: "16px",
            }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "14px" }}>Authentication</h3>
              <pre style={{
                margin: 0, padding: "10px", borderRadius: "8px",
                background: "#0a0a0a", fontSize: "12px", color: "#d4d4d4",
                whiteSpace: "pre-wrap",
              }}>
{`curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
  https://api.nexusprime.app/v1/projects/${projectId}/files`}
              </pre>
            </div>

            {[
              { method: "GET", path: "/projects/:id/files", desc: "List all project files" },
              { method: "POST", path: "/projects/:id/files", desc: "Create or update a file" },
              { method: "POST", path: "/projects/:id/prompt", desc: "Execute an AI prompt" },
              { method: "GET", path: "/projects/:id/deployments", desc: "List deployments" },
              { method: "POST", path: "/projects/:id/deploy", desc: "Trigger a deployment" },
              { method: "GET", path: "/projects/:id/versions", desc: "List project versions" },
              { method: "POST", path: "/projects/:id/versions", desc: "Create a version snapshot" },
              { method: "GET", path: "/projects/:id/reviews", desc: "List code reviews" },
              { method: "POST", path: "/projects/:id/review", desc: "Start a code review" },
            ].map((endpoint, i) => (
              <div key={i} style={{
                padding: "10px 14px", borderRadius: "8px",
                background: "#171717", border: "1px solid #262626",
                display: "flex", alignItems: "center", gap: "10px",
                marginBottom: "6px",
              }}>
                <span style={{
                  padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700,
                  background: endpoint.method === "GET" ? "#10b98120" : "#6366f120",
                  color: endpoint.method === "GET" ? "#10b981" : "#6366f1",
                  fontFamily: "monospace",
                }}>
                  {endpoint.method}
                </span>
                <code style={{ fontSize: "12px", color: "#e5e5e5" }}>{endpoint.path}</code>
                <span style={{ fontSize: "11px", color: "#525252", marginLeft: "auto" }}>{endpoint.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

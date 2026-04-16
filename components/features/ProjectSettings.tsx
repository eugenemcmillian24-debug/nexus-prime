"use client";

import React, { useState, useEffect } from "react";

interface ProjectSettings {
  id: string;
  name: string;
  description: string;
  slug: string;
  isPublic: boolean;
  teamId: string | null;
  defaultModel: string;
  autoSave: boolean;
  autoFormat: boolean;
  tabSize: number;
  theme: "dark" | "light" | "system";
  lintOnSave: boolean;
  deployTarget: "vercel" | "netlify" | "custom" | "none";
  customDomain: string;
  envVars: Array<{ key: string; value: string; isSecret: boolean }>;
  webhookUrl: string;
  webhookEvents: string[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectSettingsProps {
  projectId: string;
  onUpdate?: (settings: Partial<ProjectSettings>) => void;
}

type TabId = "general" | "editor" | "deploy" | "env" | "webhooks" | "danger";

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: "general", label: "General", icon: "⚙️" },
  { id: "editor", label: "Editor", icon: "✏️" },
  { id: "deploy", label: "Deployment", icon: "🚀" },
  { id: "env", label: "Environment", icon: "🔐" },
  { id: "webhooks", label: "Webhooks", icon: "🔗" },
  { id: "danger", label: "Danger Zone", icon: "⚠️" },
];

const WEBHOOK_EVENTS = [
  "project.updated", "file.created", "file.updated", "file.deleted",
  "version.created", "deploy.started", "deploy.completed", "deploy.failed",
  "review.completed", "member.joined",
];

export default function ProjectSettingsPanel({ projectId, onUpdate }: ProjectSettingsProps) {
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");
  const [newEnvSecret, setNewEnvSecret] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  useEffect(() => {
    fetchSettings();
  }, [projectId]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`);
      if (res.ok) setSettings(await res.json());
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const updateField = (field: keyof ProjectSettings, value: unknown) => {
    setSettings((prev) => prev ? { ...prev, [field]: value } : null);
    setIsDirty(true);
  };

  const saveSettings = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setIsDirty(false);
        onUpdate?.(settings);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const addEnvVar = () => {
    if (!newEnvKey.trim() || !settings) return;
    updateField("envVars", [
      ...settings.envVars,
      { key: newEnvKey, value: newEnvValue, isSecret: newEnvSecret },
    ]);
    setNewEnvKey("");
    setNewEnvValue("");
    setNewEnvSecret(false);
  };

  const removeEnvVar = (index: number) => {
    if (!settings) return;
    updateField("envVars", settings.envVars.filter((_, i) => i !== index));
  };

  const deleteProject = async () => {
    if (deleteInput !== settings?.name) return;
    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (!settings) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#525252" }}>
        Loading settings...
      </div>
    );
  }

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    border: "1px solid #262626", background: "#171717",
    color: "#e5e5e5", fontSize: "14px", boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block", fontSize: "12px", color: "#a3a3a3",
    marginBottom: "6px", fontWeight: 500 as const,
  };

  return (
    <div style={{ display: "flex", height: "100%", background: "#0a0a0a", color: "#e5e5e5" }}>
      {/* Settings Sidebar */}
      <div style={{ width: "200px", borderRight: "1px solid #262626", padding: "16px 8px" }}>
        <h2 style={{ margin: "0 8px 16px", fontSize: "14px", fontWeight: 600 }}>⚙️ Settings</h2>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: "8px", border: "none",
              background: activeTab === tab.id ? "#1e1b4b" : "transparent",
              color: activeTab === tab.id ? "#a5b4fc" : tab.id === "danger" ? "#ef4444" : "#a3a3a3",
              cursor: "pointer", fontSize: "13px", textAlign: "left",
              display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px",
            }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
        <div style={{ maxWidth: "640px" }}>
          {/* Save bar */}
          {isDirty && (
            <div style={{
              position: "sticky", top: 0, zIndex: 10, marginBottom: "20px",
              padding: "10px 16px", borderRadius: "10px",
              background: "#1e1b4b", border: "1px solid #6366f130",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: "13px", color: "#a5b4fc" }}>You have unsaved changes</span>
              <button
                onClick={saveSettings}
                disabled={isSaving}
                style={{
                  padding: "6px 16px", borderRadius: "6px", border: "none",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 600,
                }}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          {activeTab === "general" && (
            <div>
              <h3 style={{ margin: "0 0 20px", fontSize: "18px" }}>General</h3>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Project Name</label>
                <input type="text" value={settings.name} onChange={(e) => updateField("name", e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Description</label>
                <textarea value={settings.description || ""} onChange={(e) => updateField("description", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>URL Slug</label>
                <input type="text" value={settings.slug || ""} onChange={(e) => updateField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} style={inputStyle} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input type="checkbox" checked={settings.isPublic} onChange={(e) => updateField("isPublic", e.target.checked)} id="public" style={{ cursor: "pointer" }} />
                <label htmlFor="public" style={{ fontSize: "13px", cursor: "pointer" }}>
                  Make project public — anyone can view (not edit)
                </label>
              </div>
            </div>
          )}

          {activeTab === "editor" && (
            <div>
              <h3 style={{ margin: "0 0 20px", fontSize: "18px" }}>Editor Preferences</h3>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Default AI Model</label>
                <select value={settings.defaultModel} onChange={(e) => updateField("defaultModel", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="groq">Groq (Fast)</option>
                  <option value="gemini">Gemini (Balanced)</option>
                  <option value="openrouter">OpenRouter (Advanced)</option>
                </select>
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Tab Size</label>
                <select value={settings.tabSize} onChange={(e) => updateField("tabSize", parseInt(e.target.value))} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value={2}>2 spaces</option>
                  <option value={4}>4 spaces</option>
                  <option value={8}>8 spaces</option>
                </select>
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Theme</label>
                <select value={settings.theme} onChange={(e) => updateField("theme", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { field: "autoSave" as const, label: "Auto-save files (debounced 2s)" },
                  { field: "autoFormat" as const, label: "Format on save" },
                  { field: "lintOnSave" as const, label: "Lint on save" },
                ].map(({ field, label }) => (
                  <div key={field} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="checkbox"
                      checked={settings[field] as boolean}
                      onChange={(e) => updateField(field, e.target.checked)}
                      id={field}
                      style={{ cursor: "pointer" }}
                    />
                    <label htmlFor={field} style={{ fontSize: "13px", cursor: "pointer" }}>{label}</label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "deploy" && (
            <div>
              <h3 style={{ margin: "0 0 20px", fontSize: "18px" }}>Deployment</h3>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Deploy Target</label>
                <select value={settings.deployTarget} onChange={(e) => updateField("deployTarget", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="vercel">Vercel</option>
                  <option value="netlify">Netlify</option>
                  <option value="custom">Custom</option>
                  <option value="none">Disabled</option>
                </select>
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Custom Domain</label>
                <input type="text" value={settings.customDomain || ""} onChange={(e) => updateField("customDomain", e.target.value)} placeholder="app.example.com" style={inputStyle} />
                <p style={{ fontSize: "11px", color: "#525252", marginTop: "4px" }}>
                  Configure your domain DNS to point to Vercel before setting this.
                </p>
              </div>
            </div>
          )}

          {activeTab === "env" && (
            <div>
              <h3 style={{ margin: "0 0 20px", fontSize: "18px" }}>Environment Variables</h3>
              <p style={{ fontSize: "13px", color: "#737373", margin: "0 0 16px" }}>
                Securely store API keys, tokens, and configuration. Secret values are encrypted and hidden after save.
              </p>

              {/* Existing vars */}
              {settings.envVars.map((env, i) => (
                <div key={i} style={{
                  display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center",
                }}>
                  <input type="text" value={env.key} readOnly style={{ ...inputStyle, width: "180px", background: "#0a0a0a" }} />
                  <input
                    type={env.isSecret ? "password" : "text"}
                    value={env.value}
                    onChange={(e) => {
                      const updated = [...settings.envVars];
                      updated[i] = { ...updated[i], value: e.target.value };
                      updateField("envVars", updated);
                    }}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {env.isSecret && <span style={{ fontSize: "12px", color: "#f59e0b" }}>🔒</span>}
                  <button
                    onClick={() => removeEnvVar(i)}
                    style={{
                      padding: "8px", borderRadius: "6px", border: "1px solid #7f1d1d",
                      background: "transparent", color: "#ef4444", cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Add new */}
              <div style={{
                display: "flex", gap: "8px", marginTop: "12px", padding: "12px",
                borderRadius: "8px", border: "1px dashed #262626", alignItems: "center",
              }}>
                <input type="text" value={newEnvKey} onChange={(e) => setNewEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))} placeholder="KEY_NAME" style={{ ...inputStyle, width: "160px" }} />
                <input type="text" value={newEnvValue} onChange={(e) => setNewEnvValue(e.target.value)} placeholder="value" style={{ ...inputStyle, flex: 1 }} />
                <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#737373", cursor: "pointer", whiteSpace: "nowrap" }}>
                  <input type="checkbox" checked={newEnvSecret} onChange={(e) => setNewEnvSecret(e.target.checked)} /> Secret
                </label>
                <button
                  onClick={addEnvVar}
                  disabled={!newEnvKey.trim()}
                  style={{
                    padding: "8px 14px", borderRadius: "6px", border: "none",
                    background: newEnvKey.trim() ? "#6366f1" : "#262626",
                    color: newEnvKey.trim() ? "#fff" : "#525252",
                    cursor: newEnvKey.trim() ? "pointer" : "not-allowed", fontSize: "12px",
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {activeTab === "webhooks" && (
            <div>
              <h3 style={{ margin: "0 0 20px", fontSize: "18px" }}>Webhooks</h3>
              <p style={{ fontSize: "13px", color: "#737373", margin: "0 0 16px" }}>
                Receive HTTP POST notifications when events occur in your project.
              </p>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Webhook URL</label>
                <input type="url" value={settings.webhookUrl || ""} onChange={(e) => updateField("webhookUrl", e.target.value)} placeholder="https://example.com/webhook" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Events</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {WEBHOOK_EVENTS.map((event) => (
                    <label
                      key={event}
                      style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: "6px 10px", borderRadius: "8px",
                        border: "1px solid #262626", background: "#171717",
                        fontSize: "12px", cursor: "pointer",
                        color: settings.webhookEvents?.includes(event) ? "#a5b4fc" : "#737373",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={settings.webhookEvents?.includes(event) || false}
                        onChange={(e) => {
                          const events = settings.webhookEvents || [];
                          updateField(
                            "webhookEvents",
                            e.target.checked ? [...events, event] : events.filter((ev) => ev !== event)
                          );
                        }}
                      />
                      {event}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "danger" && (
            <div>
              <h3 style={{ margin: "0 0 20px", fontSize: "18px", color: "#ef4444" }}>Danger Zone</h3>
              <div style={{
                padding: "20px", borderRadius: "10px", border: "1px solid #7f1d1d",
              }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "14px", color: "#ef4444" }}>Delete Project</h4>
                <p style={{ fontSize: "13px", color: "#737373", margin: "0 0 16px" }}>
                  This will permanently delete <strong style={{ color: "#ef4444" }}>{settings.name}</strong>,
                  including all files, versions, deployments, and reviews. This cannot be undone.
                </p>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{
                      padding: "8px 16px", borderRadius: "8px",
                      border: "1px solid #ef4444", background: "transparent",
                      color: "#ef4444", cursor: "pointer", fontSize: "13px",
                    }}
                  >
                    Delete Project
                  </button>
                ) : (
                  <div>
                    <p style={{ fontSize: "12px", color: "#a3a3a3", marginBottom: "8px" }}>
                      Type <strong style={{ color: "#ef4444" }}>{settings.name}</strong> to confirm:
                    </p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        value={deleteInput}
                        onChange={(e) => setDeleteInput(e.target.value)}
                        placeholder={settings.name}
                        style={{ ...inputStyle, borderColor: "#7f1d1d" }}
                      />
                      <button
                        onClick={deleteProject}
                        disabled={deleteInput !== settings.name}
                        style={{
                          padding: "8px 16px", borderRadius: "8px", border: "none",
                          background: deleteInput === settings.name ? "#dc2626" : "#262626",
                          color: deleteInput === settings.name ? "#fff" : "#525252",
                          cursor: deleteInput === settings.name ? "pointer" : "not-allowed",
                          fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap",
                        }}
                      >
                        Permanently Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

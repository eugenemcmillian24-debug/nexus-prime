"use client";

import React, { useState, useEffect } from "react";

interface ApiKey {
  id: string;
  provider: string;
  label: string;
  keyPreview: string; // e.g., "sk-...abc123"
  isActive: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  rateLimits?: { rpm: number; tpm: number };
}

interface ApiKeyManagerProps {
  userId: string;
}

const PROVIDERS = [
  { id: "zen", name: "Zen (OpenCode)", icon: "☯️", color: "#00ff88", placeholder: "opencode_...", docs: "https://opencode.ai/docs/zen" },
  { id: "vercel", name: "Vercel", icon: "▲", color: "#ffffff", placeholder: "vercel_...", docs: "https://vercel.com/account/tokens" },
  { id: "stripe", name: "Stripe", icon: "💳", color: "#635bff", placeholder: "sk_live_...", docs: "https://dashboard.stripe.com/apikeys" },
];

export default function ApiKeyManager({ userId }: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addProvider, setAddProvider] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addKey, setAddKey] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/keys");
      if (res.ok) setKeys(await res.json());
    } catch (err) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to fetch keys:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const addApiKey = async () => {
    if (!addProvider || !addKey.trim()) return;
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: addProvider,
          label: addLabel || `${addProvider} key`,
          key: addKey,
        }),
      });
      if (res.ok) {
        await fetchKeys();
        resetForm();
      }
    } catch (err) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to add key:", err);
    }
  };

  const deleteKey = async (id: string) => {
    try {
      await fetch(`/api/keys/${id}`, { method: "DELETE" });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to delete key:", err);
    }
  };

  const toggleKey = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, isActive: !isActive } : k))
      );
    } catch (err) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to toggle key:", err);
    }
  };

  const testKey = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/keys/${id}/test`, { method: "POST" });
      const data = await res.json();
      setTestResult({ id, success: data.success, message: data.message });
    } catch (err) {
      setTestResult({ id, success: false, message: "Test failed" });
    } finally {
      setTestingId(null);
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setAddProvider("");
    setAddLabel("");
    setAddKey("");
  };

  const getProvider = (id: string) => PROVIDERS.find((p) => p.id === id);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a", color: "#e5e5e5" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🔑</span>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>API Keys</h2>
            <span style={{ fontSize: "12px", color: "#525252" }}>
              {keys.filter((k) => k.isActive).length} active / {keys.length} total
            </span>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: "8px 14px", borderRadius: "8px", border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 600,
            }}
          >
            + Add Key
          </button>
        </div>

        {/* Security notice */}
        <div style={{
          marginTop: "12px", padding: "10px 14px", borderRadius: "8px",
          background: "#171717", border: "1px solid #262626", fontSize: "12px", color: "#737373",
          display: "flex", gap: "8px",
        }}>
          <span>🔒</span>
          <span>Keys are encrypted at rest. Only you can view masked previews. Full keys are never exposed after storage.</span>
        </div>
      </div>

      {/* Add Key Form */}
      {showAddForm && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626", background: "#0d0d0d" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>Add API Key</h3>

          {/* Provider selection */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#a3a3a3", marginBottom: "6px" }}>Provider</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setAddProvider(provider.id)}
                  style={{
                    padding: "8px 14px", borderRadius: "8px", border: "1px solid",
                    borderColor: addProvider === provider.id ? provider.color : "#262626",
                    background: addProvider === provider.id ? provider.color + "15" : "transparent",
                    color: addProvider === provider.id ? provider.color : "#737373",
                    cursor: "pointer", fontSize: "12px",
                    display: "flex", alignItems: "center", gap: "6px",
                  }}
                >
                  <span>{provider.icon}</span> {provider.name}
                </button>
              ))}
            </div>
          </div>

          {addProvider && (
            <>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#a3a3a3", marginBottom: "6px" }}>Label (optional)</label>
                <input
                  type="text"
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  placeholder={`My ${getProvider(addProvider)?.name} key`}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: "8px",
                    border: "1px solid #262626", background: "#171717",
                    color: "#e5e5e5", fontSize: "13px", boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#a3a3a3", marginBottom: "6px" }}>
                  API Key{" "}
                  <a href={getProvider(addProvider)?.docs} target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1", textDecoration: "none" }}>
                    Get key →
                  </a>
                </label>
                <input
                  type="password"
                  value={addKey}
                  onChange={(e) => setAddKey(e.target.value)}
                  placeholder={getProvider(addProvider)?.placeholder}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: "8px",
                    border: "1px solid #262626", background: "#171717",
                    color: "#e5e5e5", fontSize: "13px", fontFamily: "monospace", boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={addApiKey}
                  disabled={!addKey.trim()}
                  style={{
                    padding: "8px 16px", borderRadius: "8px", border: "none",
                    background: addKey.trim() ? "#6366f1" : "#262626",
                    color: addKey.trim() ? "#fff" : "#525252",
                    cursor: addKey.trim() ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: 600,
                  }}
                >
                  Save Key
                </button>
                <button onClick={resetForm} style={{
                  padding: "8px 16px", borderRadius: "8px", border: "1px solid #262626",
                  background: "transparent", color: "#737373", cursor: "pointer", fontSize: "13px",
                }}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Keys List */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 20px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#525252" }}>Loading...</div>
        ) : keys.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#525252" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔑</div>
            <p>No API keys yet</p>
            <p style={{ fontSize: "12px" }}>Add your first key to unlock AI-powered features</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {keys.map((key) => {
              const provider = getProvider(key.provider);
              const isTest = testResult?.id === key.id;

              return (
                <div
                  key={key.id}
                  style={{
                    padding: "14px 16px", borderRadius: "10px",
                    border: "1px solid #262626", background: "#171717",
                    opacity: key.isActive ? 1 : 0.5,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "18px" }}>{provider?.icon || "🔑"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600 }}>{key.label}</span>
                        <span style={{
                          padding: "1px 6px", borderRadius: "8px", fontSize: "10px",
                          background: (provider?.color || "#525252") + "20",
                          color: provider?.color || "#525252", textTransform: "uppercase",
                        }}>
                          {key.provider}
                        </span>
                        {!key.isActive && (
                          <span style={{ padding: "1px 6px", borderRadius: "8px", fontSize: "10px", background: "#7f1d1d20", color: "#ef4444" }}>
                            disabled
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "#525252" }}>
                        <code style={{ background: "#0a0a0a", padding: "1px 6px", borderRadius: "4px" }}>{key.keyPreview}</code>
                        <span>{key.usageCount.toLocaleString()} calls</span>
                        {key.lastUsedAt && <span>Last: {new Date(key.lastUsedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        onClick={() => testKey(key.id)}
                        disabled={testingId === key.id}
                        style={{
                          padding: "6px 10px", borderRadius: "6px", border: "1px solid #262626",
                          background: "transparent", cursor: "pointer", fontSize: "11px",
                          color: isTest ? (testResult.success ? "#10b981" : "#ef4444") : "#737373",
                        }}
                      >
                        {testingId === key.id ? "..." : isTest ? (testResult.success ? "✓ Valid" : "✗ Invalid") : "Test"}
                      </button>
                      <button
                        onClick={() => toggleKey(key.id, key.isActive)}
                        style={{
                          padding: "6px 10px", borderRadius: "6px", border: "1px solid #262626",
                          background: "transparent", color: key.isActive ? "#f59e0b" : "#10b981",
                          cursor: "pointer", fontSize: "11px",
                        }}
                      >
                        {key.isActive ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => deleteKey(key.id)}
                        style={{
                          padding: "6px 10px", borderRadius: "6px", border: "1px solid #7f1d1d",
                          background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: "11px",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

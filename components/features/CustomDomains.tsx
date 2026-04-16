"use client";

import React, { useState, useEffect } from "react";

interface DomainConfig {
  id: string;
  domain: string;
  status: "pending" | "verifying" | "active" | "error" | "expired";
  sslStatus: "pending" | "provisioning" | "active" | "error";
  dnsRecords: Array<{ type: string; name: string; value: string; verified: boolean }>;
  createdAt: string;
  verifiedAt?: string;
  expiresAt?: string;
}

interface CustomDomainsProps {
  projectId: string;
  projectName: string;
}

const STATUS_CONFIG = {
  pending: { color: "#f59e0b", label: "Pending DNS", icon: "⏳" },
  verifying: { color: "#3b82f6", label: "Verifying", icon: "🔄" },
  active: { color: "#10b981", label: "Active", icon: "✅" },
  error: { color: "#ef4444", label: "Error", icon: "❌" },
  expired: { color: "#525252", label: "Expired", icon: "⚠️" },
};

const SSL_CONFIG = {
  pending: { color: "#525252", label: "Pending" },
  provisioning: { color: "#f59e0b", label: "Provisioning" },
  active: { color: "#10b981", label: "Secured" },
  error: { color: "#ef4444", label: "Error" },
};

export default function CustomDomains({ projectId, projectName }: CustomDomainsProps) {
  const [domains, setDomains] = useState<DomainConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    fetchDomains();
  }, [projectId]);

  const fetchDomains = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/domains`);
      if (res.ok) setDomains(await res.json());
    } catch (err) {
      console.error("Failed to fetch domains:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) return;
    setAddError("");

    // Basic domain validation
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(newDomain.trim())) {
      setAddError("Invalid domain format. Example: app.yourdomain.com");
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim().toLowerCase() }),
      });
      if (res.ok) {
        const domain = await res.json();
        setDomains((prev) => [domain, ...prev]);
        setNewDomain("");
        setShowAddForm(false);
        setExpandedId(domain.id);
      } else {
        const err = await res.json();
        setAddError(err.error || "Failed to add domain");
      }
    } catch (err) {
      setAddError("Network error");
    }
  };

  const verifyDomain = async (id: string) => {
    setVerifyingId(id);
    try {
      const res = await fetch(`/api/projects/${projectId}/domains/${id}/verify`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setDomains((prev) => prev.map((d) => (d.id === id ? updated : d)));
      }
    } catch (err) {
      console.error("Verify failed:", err);
    } finally {
      setVerifyingId(null);
    }
  };

  const removeDomain = async (id: string) => {
    if (!confirm("Remove this domain? This will disconnect it from your project.")) return;
    try {
      await fetch(`/api/projects/${projectId}/domains/${id}`, { method: "DELETE" });
      setDomains((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Remove failed:", err);
    }
  };

  const defaultDomain = `${projectName?.toLowerCase().replace(/\s+/g, "-") || "project"}.nexusprime.app`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a", color: "#e5e5e5" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🌐</span>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>Custom Domains</h2>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: "8px 14px", borderRadius: "8px", border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 600,
            }}
          >
            + Add Domain
          </button>
        </div>

        {/* Default domain */}
        <div style={{
          padding: "10px 14px", borderRadius: "8px",
          background: "#171717", border: "1px solid #262626",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: "12px", color: "#525252", marginBottom: "2px" }}>Default Domain</div>
            <div style={{ fontSize: "13px", fontFamily: "monospace" }}>
              <a href={`https://${defaultDomain}`} target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1", textDecoration: "none" }}>
                {defaultDomain}
              </a>
            </div>
          </div>
          <span style={{ padding: "2px 8px", borderRadius: "8px", fontSize: "10px", background: "#10b98120", color: "#10b981" }}>
            ✅ Active
          </span>
        </div>
      </div>

      {/* Add Domain Form */}
      {showAddForm && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626", background: "#0d0d0d" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>Add Custom Domain</h3>
          <div style={{ marginBottom: "8px" }}>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => { setNewDomain(e.target.value); setAddError(""); }}
              placeholder="app.yourdomain.com"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "8px",
                border: `1px solid ${addError ? "#ef4444" : "#262626"}`, background: "#171717",
                color: "#e5e5e5", fontSize: "13px", fontFamily: "monospace", boxSizing: "border-box",
              }}
              onKeyDown={(e) => e.key === "Enter" && addDomain()}
            />
            {addError && <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "4px" }}>{addError}</div>}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={addDomain} style={{
              padding: "8px 16px", borderRadius: "8px", border: "none",
              background: "#6366f1", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 600,
            }}>
              Add Domain
            </button>
            <button onClick={() => { setShowAddForm(false); setAddError(""); }} style={{
              padding: "8px 16px", borderRadius: "8px", border: "1px solid #262626",
              background: "transparent", color: "#737373", cursor: "pointer", fontSize: "13px",
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Domain List */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 20px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#525252" }}>Loading...</div>
        ) : domains.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#525252" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🌐</div>
            <p>No custom domains yet</p>
            <p style={{ fontSize: "12px" }}>Your app is live at <strong>{defaultDomain}</strong></p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {domains.map((domain) => {
              const status = STATUS_CONFIG[domain.status];
              const ssl = SSL_CONFIG[domain.sslStatus];
              const isExpanded = expandedId === domain.id;

              return (
                <div key={domain.id} style={{
                  borderRadius: "10px", border: "1px solid #262626", background: "#171717",
                }}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : domain.id)}
                    style={{
                      padding: "14px 16px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "12px",
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>{status.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, fontFamily: "monospace" }}>{domain.domain}</div>
                      <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                        <span style={{
                          padding: "1px 6px", borderRadius: "8px", fontSize: "10px",
                          background: status.color + "15", color: status.color,
                        }}>
                          {status.label}
                        </span>
                        <span style={{
                          padding: "1px 6px", borderRadius: "8px", fontSize: "10px",
                          background: ssl.color + "15", color: ssl.color,
                        }}>
                          🔒 SSL: {ssl.label}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: "12px", color: "#3f3f46" }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "0 16px 14px", borderTop: "1px solid #1a1a1a" }}>
                      {/* DNS Records */}
                      <div style={{ marginTop: "12px" }}>
                        <div style={{ fontSize: "12px", color: "#6366f1", fontWeight: 600, marginBottom: "8px" }}>
                          DNS CONFIGURATION
                        </div>
                        <div style={{ fontSize: "12px", color: "#737373", marginBottom: "8px" }}>
                          Add these records to your domain's DNS settings:
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                          <thead>
                            <tr style={{ color: "#525252" }}>
                              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #262626" }}>Type</th>
                              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #262626" }}>Name</th>
                              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #262626" }}>Value</th>
                              <th style={{ textAlign: "center", padding: "6px 8px", borderBottom: "1px solid #262626" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {domain.dnsRecords.map((record, i) => (
                              <tr key={i}>
                                <td style={{ padding: "6px 8px", fontFamily: "monospace", color: "#f59e0b" }}>{record.type}</td>
                                <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{record.name}</td>
                                <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: "11px", wordBreak: "break-all" }}>{record.value}</td>
                                <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                  {record.verified ? (
                                    <span style={{ color: "#10b981" }}>✓</span>
                                  ) : (
                                    <span style={{ color: "#f59e0b" }}>⏳</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                        {domain.status !== "active" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); verifyDomain(domain.id); }}
                            disabled={verifyingId === domain.id}
                            style={{
                              padding: "6px 14px", borderRadius: "6px", border: "none",
                              background: "#6366f1", color: "#fff", cursor: "pointer",
                              fontSize: "12px", fontWeight: 600,
                            }}
                          >
                            {verifyingId === domain.id ? "Verifying..." : "Verify DNS"}
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeDomain(domain.id); }}
                          style={{
                            padding: "6px 14px", borderRadius: "6px", border: "1px solid #7f1d1d",
                            background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: "12px",
                          }}
                        >
                          Remove
                        </button>
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

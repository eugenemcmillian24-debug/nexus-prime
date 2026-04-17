"use client";

import React, { useState, useEffect, useCallback } from "react";

interface Deployment {
  id: string;
  projectId: string;
  versionNumber?: number;
  platform: "vercel" | "netlify" | "custom";
  status: "queued" | "building" | "deploying" | "ready" | "failed" | "cancelled";
  deployUrl?: string;
  previewUrl?: string;
  buildLog?: string;
  errorMessage?: string;
  environment: "preview" | "production";
  commitSha?: string;
  metadata: Record<string, unknown>;
  triggeredBy: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface DeploymentPipelineProps {
  projectId: string;
  projectName: string;
  currentVersion?: number;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  queued: { color: "#a3a3a3", bg: "#262626", icon: "⏳", label: "Queued" },
  building: { color: "#f59e0b", bg: "#78350f", icon: "🔨", label: "Building" },
  deploying: { color: "#6366f1", bg: "#1e1b4b", icon: "🚀", label: "Deploying" },
  ready: { color: "#10b981", bg: "#065f46", icon: "✅", label: "Ready" },
  failed: { color: "#ef4444", bg: "#7f1d1d", icon: "❌", label: "Failed" },
  cancelled: { color: "#737373", bg: "#262626", icon: "⛔", label: "Cancelled" },
};

export default function DeploymentPipeline({
  projectId,
  projectName,
  currentVersion,
}: DeploymentPipelineProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<"preview" | "production">("preview");
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [confirmProd, setConfirmProd] = useState(false);
  const [healingId, setHealingId] = useState<string | null>(null);
  const [healResult, setHealResult] = useState<{ analysis: string; files: any[] } | null>(null);

  useEffect(() => {
    fetchDeployments();
  }, [projectId]);

  const fetchDeployments = async () => {
    try {
      const res = await fetch(`/api/deployments?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setDeployments(data);
      }
    } catch (error) {
      console.error("Failed to fetch deployments:", error);
    }
  };

  const triggerDeploy = useCallback(async (env: "preview" | "production") => {
    if (env === "production" && !confirmProd) {
      setConfirmProd(true);
      return;
    }
    setConfirmProd(false);
    setIsDeploying(true);

    try {
      const res = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          environment: env,
          versionNumber: currentVersion,
        }),
      });

      if (!res.ok) throw new Error("Deploy failed");

      const deployment: Deployment = await res.json();
      setDeployments((prev) => [deployment, ...prev]);

      // Poll for status updates
      pollDeployStatus(deployment.id);
    } catch (error) {
      console.error("Deploy failed:", error);
    } finally {
      setIsDeploying(false);
    }
  }, [projectId, currentVersion, confirmProd]);

  const pollDeployStatus = async (deployId: string) => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/deployments/${deployId}`);
        if (res.ok) {
          const updated: Deployment = await res.json();
          setDeployments((prev) =>
            prev.map((d) => (d.id === deployId ? updated : d))
          );
          if (["ready", "failed", "cancelled"].includes(updated.status)) {
            clearInterval(poll);
          }
        }
      } catch {
        clearInterval(poll);
      }
    }, 3000);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(poll), 300000);
  };

  const cancelDeploy = async (deployId: string) => {
    try {
      await fetch(`/api/deployments/${deployId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      setDeployments((prev) =>
        prev.map((d) => (d.id === deployId ? { ...d, status: "cancelled" as const } : d))
      );
    } catch (error) {
      console.error("Cancel failed:", error);
    }
  };

  const rollbackDeploy = async (deployId: string) => {
    try {
      await fetch("/api/deployments/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, deploymentId: deployId }),
      });
      fetchDeployments();
    } catch (error) {
      console.error("Rollback failed:", error);
    }
  };

  const healWithAI = async (deployId: string) => {
    setHealingId(deployId);
    setHealResult(null);
    try {
      const res = await fetch("/api/deployments/heal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentId: deployId }),
      });
      if (res.ok) {
        const result = await res.json();
        setHealResult(result);
        setShowLogs(deployId);
      } else {
        alert("Healing failed. Please try again or check logs.");
      }
    } catch (error) {
      console.error("Heal failed:", error);
    } finally {
      setHealingId(null);
    }
  };

  const applyHeal = async () => {
    if (!healResult) return;
    try {
      const res = await fetch("/api/deployments/heal/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, files: healResult.files }),
      });
      if (res.ok) {
        setHealResult(null);
        triggerDeploy(selectedEnv);
      }
    } catch (error) {
      console.error("Apply heal failed:", error);
    }
  };

  const activeDeployment = deployments.find((d) =>
    ["queued", "building", "deploying"].includes(d.status)
  );

  const latestProduction = deployments.find(
    (d) => d.environment === "production" && d.status === "ready"
  );

  const latestPreview = deployments.find(
    (d) => d.environment === "preview" && d.status === "ready"
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a", color: "#e5e5e5" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "20px" }}>🚀</span>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>Deploy Pipeline</h2>
            <span style={{ fontSize: "12px", color: "#737373" }}>{projectName} · v{currentVersion || 1}</span>
          </div>
        </div>
      </div>

      {/* Quick Status */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626", display: "flex", gap: "12px" }}>
        <div style={{ flex: 1, padding: "12px 16px", borderRadius: "10px", background: "#171717", border: "1px solid #262626" }}>
          <div style={{ fontSize: "11px", color: "#737373", marginBottom: "4px" }}>Production</div>
          {latestProduction ? (
            <a
              href={latestProduction.deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "13px", color: "#10b981", textDecoration: "none" }}
            >
              ✅ Live →
            </a>
          ) : (
            <span style={{ fontSize: "13px", color: "#525252" }}>Not deployed</span>
          )}
        </div>
        <div style={{ flex: 1, padding: "12px 16px", borderRadius: "10px", background: "#171717", border: "1px solid #262626" }}>
          <div style={{ fontSize: "11px", color: "#737373", marginBottom: "4px" }}>Preview</div>
          {latestPreview ? (
            <a
              href={latestPreview.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "13px", color: "#6366f1", textDecoration: "none" }}
            >
              🔗 Preview →
            </a>
          ) : (
            <span style={{ fontSize: "13px", color: "#525252" }}>No preview</span>
          )}
        </div>
      </div>

      {/* Deploy Actions */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626", display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ display: "flex", background: "#171717", borderRadius: "8px", overflow: "hidden", border: "1px solid #262626" }}>
          {(["preview", "production"] as const).map((env) => (
            <button
              key={env}
              onClick={() => { setSelectedEnv(env); setConfirmProd(false); }}
              style={{
                padding: "8px 16px", border: "none",
                background: selectedEnv === env ? (env === "production" ? "#7f1d1d" : "#1e1b4b") : "transparent",
                color: selectedEnv === env ? (env === "production" ? "#fca5a5" : "#a5b4fc") : "#737373",
                cursor: "pointer", fontSize: "13px", fontWeight: 500,
              }}
            >
              {env === "production" ? "🌐 Production" : "👁️ Preview"}
            </button>
          ))}
        </div>

        <button
          onClick={() => triggerDeploy(selectedEnv)}
          disabled={isDeploying || !!activeDeployment}
          style={{
            padding: "8px 20px", borderRadius: "8px", border: "none",
            background: confirmProd
              ? "#dc2626"
              : isDeploying || activeDeployment
              ? "#262626"
              : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: isDeploying || activeDeployment ? "#525252" : "#fff",
            cursor: isDeploying || activeDeployment ? "not-allowed" : "pointer",
            fontSize: "13px", fontWeight: 600,
          }}
        >
          {confirmProd
            ? "⚠️ Confirm Production Deploy"
            : isDeploying
            ? "Deploying..."
            : activeDeployment
            ? `${STATUS_CONFIG[activeDeployment.status].icon} ${STATUS_CONFIG[activeDeployment.status].label}...`
            : `🚀 Deploy to ${selectedEnv}`}
        </button>

        {confirmProd && (
          <button
            onClick={() => setConfirmProd(false)}
            style={{
              padding: "8px 12px", borderRadius: "8px", border: "1px solid #262626",
              background: "transparent", color: "#737373", cursor: "pointer", fontSize: "13px",
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Active deployment progress */}
      {activeDeployment && (
        <div style={{
          margin: "16px 20px", padding: "16px", borderRadius: "10px",
          background: "#171717", border: `1px solid ${STATUS_CONFIG[activeDeployment.status].color}40`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>{STATUS_CONFIG[activeDeployment.status].icon}</span>
              <span style={{ fontSize: "14px", fontWeight: 600 }}>{STATUS_CONFIG[activeDeployment.status].label}</span>
            </div>
            <button
              onClick={() => cancelDeploy(activeDeployment.id)}
              style={{
                padding: "4px 10px", borderRadius: "6px", border: "1px solid #7f1d1d",
                background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: "12px",
              }}
            >
              Cancel
            </button>
          </div>
          {/* Progress bar */}
          <div style={{ height: "4px", background: "#262626", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: "2px",
              background: STATUS_CONFIG[activeDeployment.status].color,
              width: activeDeployment.status === "queued" ? "10%" : activeDeployment.status === "building" ? "50%" : "80%",
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>
      )}

      {/* Deployment History */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 20px 20px" }}>
        <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#737373", margin: "16px 0 12px" }}>
          Deploy History
        </h3>
        {deployments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#525252" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🚀</div>
            <p style={{ fontSize: "14px" }}>No deployments yet</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {deployments.map((deploy) => {
              const config = STATUS_CONFIG[deploy.status];
              return (
                <div
                  key={deploy.id}
                  style={{
                    padding: "12px 16px", borderRadius: "10px",
                    background: "#171717", border: "1px solid #262626",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "16px" }}>{config.icon}</span>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 500 }}>
                          {deploy.environment === "production" ? "🌐" : "👁️"}{" "}
                          {deploy.environment} {deploy.versionNumber ? `v${deploy.versionNumber}` : ""}
                        </div>
                        <div style={{ fontSize: "11px", color: "#525252", marginTop: "2px" }}>
                          {new Date(deploy.createdAt).toLocaleString()}
                          {deploy.completedAt && ` · ${Math.round((new Date(deploy.completedAt).getTime() - new Date(deploy.createdAt).getTime()) / 1000)}s`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {deploy.deployUrl && (
                        <a
                          href={deploy.deployUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: "4px 10px", borderRadius: "6px",
                            border: "1px solid #262626", background: "#171717",
                            color: "#a5b4fc", fontSize: "12px", textDecoration: "none",
                          }}
                        >
                          Visit →
                        </a>
                      )}
                      <button
                        onClick={() => setShowLogs(showLogs === deploy.id ? null : deploy.id)}
                        style={{
                          padding: "4px 10px", borderRadius: "6px",
                          border: "1px solid #262626", background: "transparent",
                          color: "#737373", fontSize: "12px", cursor: "pointer",
                        }}
                      >
                        Logs
                      </button>
                      {deploy.status === "failed" && (
                        <button
                          onClick={() => healWithAI(deploy.id)}
                          disabled={healingId === deploy.id}
                          style={{
                            padding: "4px 10px", borderRadius: "6px",
                            border: "1px solid #00ff8844", background: "#00ff8811",
                            color: "#00ff88", fontSize: "12px", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: "4px"
                          }}
                        >
                          {healingId === deploy.id ? "✨ Healing..." : "✨ Heal with AI"}
                        </button>
                      )}
                      {deploy.status === "ready" && deploy.environment === "production" && (
                        <button
                          onClick={() => rollbackDeploy(deploy.id)}
                          style={{
                            padding: "4px 10px", borderRadius: "6px",
                            border: "1px solid #7f1d1d", background: "transparent",
                            color: "#ef4444", fontSize: "12px", cursor: "pointer",
                          }}
                        >
                          Rollback
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Logs */}
                  {showLogs === deploy.id && (
                    <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <pre style={{
                        padding: "10px", borderRadius: "6px",
                        background: "#0a0a0a", border: "1px solid #262626",
                        fontSize: "11px", color: "#a3a3a3", overflow: "auto",
                        maxHeight: "200px", whiteSpace: "pre-wrap",
                      }}>
                        {deploy.buildLog || deploy.errorMessage || "No logs available"}
                      </pre>

                      {healResult && showLogs === deploy.id && (
                        <div style={{
                          padding: "16px", borderRadius: "8px",
                          background: "#00ff8808", border: "1px solid #00ff8822",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                            <div>
                              <div style={{ fontSize: "12px", fontWeight: 700, color: "#00ff88", textTransform: "uppercase", tracking: "0.1em" }}>
                                AI Healing Analysis
                              </div>
                              <p style={{ fontSize: "11px", color: "#e5e5e5", marginTop: "4px", lineHeight: "1.4" }}>
                                {healResult.analysis}
                              </p>
                            </div>
                            <button
                              onClick={applyHeal}
                              style={{
                                padding: "6px 12px", borderRadius: "6px", border: "none",
                                background: "#00ff88", color: "#000", fontWeight: 700,
                                fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap"
                              }}
                            >
                              Apply Fix & Redeploy
                            </button>
                          </div>
                          <div style={{ fontSize: "10px", color: "#525252", fontWeight: 600, marginBottom: "6px" }}>
                            MODIFIED FILES ({healResult.files.length})
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {healResult.files.map((f: any) => (
                              <div key={f.path} style={{ fontSize: "11px", color: "#a3a3a3", display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ color: "#00ff88" }}>+</span> {f.path}
                              </div>
                            ))}
                          </div>
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
    </div>
  );
}

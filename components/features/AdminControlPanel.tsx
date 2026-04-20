"use client";

import React, { useState, useEffect } from "react";
import { TIER_LIMITS, PREMIUM_AGENTS } from "@/lib/nexus_prime_constants";

interface EnvVar {
  key: string;
  value: string;
  id?: string;
}

export default function AdminControlPanel() {
  const [envs, setEnvs] = useState<EnvVar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ supabase: boolean; stripe: boolean; vercel: boolean }>({
    supabase: true,
    stripe: true,
    vercel: true
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [activeDeployment, setActiveDeployment] = useState<string>("");
  const [deploymentState, setDeploymentState] = useState<string>("UNKNOWN");
  const [isHealing, setIsHealing] = useState(false);
  const [seatOverrides, setSeatOverrides] = useState<{ userId: string, seats: number }[]>([]);
  const [newOverride, setNewOverride] = useState({ userId: "", seats: 10 });
  const [domainStats, setDomainStats] = useState({ total: 0, pending: 0, feesCollected: 0 });
  const [moderationModules, setModerationModules] = useState<any[]>([]);

  useEffect(() => {
    fetchEnvs();
    fetchLogs();
    fetchOverrides();
    fetchDomainStats();
    fetchModerationModules();
  }, []);

  const fetchModerationModules = async () => {
    try {
      const res = await fetch("/api/admin/marketplace");
      if (res.ok) {
        const data = await res.json();
        setModerationModules(data.modules);
      }
    } catch (error) {
      // PROD FIX: Removed console.error
      // console.error("Failed to fetch moderation modules:", error);
    }
  };

  const handleToggleFeatured = async (moduleId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/marketplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, isFeatured: !currentStatus })
      });
      if (res.ok) {
        fetchModerationModules();
      }
    } catch (error) {
      // PROD FIX: Removed console.error
      // console.error("Failed to toggle featured status:", error);
    }
  };

  const fetchDomainStats = async () => {
    try {
      const res = await fetch("/api/admin/domain-stats");
      if (res.ok) {
        const data = await res.json();
        setDomainStats(data);
      }
    } catch (error) {
      // PROD FIX: Removed console.error
      // console.error("Failed to fetch domain stats:", error);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/vercel-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.events || []);
        setActiveDeployment(data.deploymentId);
        
        // Find if any error event exists
        const hasError = (data.events || []).some((e: any) => e.type === 'stderr');
        setDeploymentState(hasError ? "ERROR" : "READY");
      }
    } catch (error) {
      // PROD FIX: Removed console.error
      // console.error("Failed to fetch logs:", error);
    }
  };

  const handleAutoHeal = async () => {
    if (!activeDeployment) return;
    setIsHealing(true);
    try {
      const res = await fetch("/api/admin/heal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentId: activeDeployment })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`HEAL SUCCESSFUL!\nAnalysis: ${data.analysis}\nFixed Files: ${data.filesFixed.join(", ")}`);
        fetchLogs();
      } else {
        alert(`HEAL FAILED: ${data.error}`);
      }
    } catch (error) {
      alert("Healing process crashed");
    } finally {
      setIsHealing(false);
    }
  };

  const fetchOverrides = async () => {
    try {
      const res = await fetch("/api/admin/seat-overrides");
      if (res.ok) {
        const data = await res.json();
        setSeatOverrides(data.overrides || []);
      }
    } catch (error) {
      // PROD FIX: Removed console.error
      // console.error("Failed to fetch overrides:", error);
    }
  };

  const handleAddOverride = async () => {
    try {
      const res = await fetch("/api/admin/seat-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOverride)
      });
      if (res.ok) {
        alert("Override added!");
        fetchOverrides();
      }
    } catch (error) {
      alert("Failed to add override");
    }
  };

  const fetchEnvs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/vercel-sync");
      if (res.ok) {
        const data = await res.json();
        setEnvs(data.envs);
      }
    } catch (error) {
      // PROD FIX: Removed console.error
      // console.error("Failed to fetch envs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/vercel-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync: true })
      });
      if (res.ok) {
        alert("Environment variables synced successfully!");
        fetchEnvs();
      }
    } catch (error) {
      alert("Sync failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "32px", maxWidth: "1000px", margin: "0 auto", fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", color: "#fff" }}>SYSTEM CONTROL CENTER</h1>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#737373" }}>NEXUS PRIME ARCHITECTURE UNIFIED · ADMIN ACCESS</p>
        </div>
        <button 
          onClick={handleSync}
          disabled={isLoading}
          style={{
            background: "#00ff88",
            color: "#000",
            border: "none",
            padding: "8px 16px",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: "bold",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.5 : 1,
            width: window.innerWidth < 640 ? "100%" : "auto"
          }}
        >
          {isLoading ? "SYNCING..." : "SYNC VERCEL ENVS"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        <StatusCard title="SUPABASE" subtitle="Management API" active={status.supabase} feature="User-Metadata Role Check" />
        <StatusCard title="STRIPE" subtitle="Payment Gateway" active={status.stripe} feature="Payment Bypass Sequence" />
        <StatusCard title="VERCEL" subtitle="Deployment Engine" active={status.vercel} feature="Unthrottled Build Pipeline" />
        <StatusCard title="DOMAINS" subtitle="Infrastructure" active={true} feature={`${domainStats.total} Linked · $${domainStats.feesCollected} Fees`} />
      </div>

      <div style={{ background: "#050505", border: "1px solid #262626", borderRadius: "8px", overflow: "hidden" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #262626", background: "#0a0a0a" }}>
          <h2 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>ACTIVE ENVIRONMENT CONFIGURATION</h2>
        </div>
        <div style={{ padding: "0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#737373", borderBottom: "1px solid #262626" }}>
                <th style={{ padding: "12px 16px" }}>VARIABLE KEY</th>
                <th style={{ padding: "12px 16px" }}>STATUS</th>
                <th style={{ padding: "12px 16px" }}>LAST UPDATED</th>
              </tr>
            </thead>
            <tbody>
              {envs.map((env) => (
                <tr key={env.key} style={{ borderBottom: "1px solid #171717" }}>
                  <td style={{ padding: "12px 16px", color: "#00ff88" }}>{env.key}</td>
                  <td style={{ padding: "12px 16px", color: "#d4d4d4" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "6px", height: "6px", background: "#00ff88", borderRadius: "50%" }} />
                      ACTIVE
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#737373" }}>SYSTEM_SYNC_2026</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: window.innerWidth < 1024 ? "1fr" : "1.2fr 0.8fr", gap: "16px" }}>
        {/* Live Build Logs */}
        <div style={{ background: "#050505", border: "1px solid #262626", borderRadius: "8px", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid #262626", background: "#0a0a0a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>LIVE BUILD LOGS: {activeDeployment}</h3>
              {deploymentState === "ERROR" && (
                <span style={{ fontSize: "10px", padding: "2px 6px", background: "#ef4444", color: "#fff", borderRadius: "4px", fontWeight: "bold" }}>BUILD FAILED</span>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {deploymentState === "ERROR" && (
                <button 
                  onClick={handleAutoHeal} 
                  disabled={isHealing}
                  style={{ 
                    background: "#8b5cf6", 
                    border: "none", 
                    color: "#fff", 
                    fontSize: "10px", 
                    padding: "4px 12px", 
                    borderRadius: "4px",
                    fontWeight: "bold",
                    cursor: isHealing ? "not-allowed" : "pointer",
                    opacity: isHealing ? 0.5 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {isHealing ? "HEALING..." : "🪄 AUTO-HEAL"}
                </button>
              )}
              <button onClick={fetchLogs} style={{ background: "transparent", border: "1px solid #262626", color: "#737373", fontSize: "10px", padding: "4px 8px", cursor: "pointer", borderRadius: "4px" }}>REFRESH</button>
            </div>
          </div>
          <div style={{ flex: 1, padding: "16px", maxHeight: "400px", overflowY: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#d4d4d4" }}>
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: "4px", borderBottom: "1px solid #171717", paddingBottom: "4px" }}>
                <span style={{ color: log.type === 'stderr' ? '#ef4444' : '#737373', marginRight: "8px" }}>[{log.type}]</span>
                {log.text}
              </div>
            ))}
            {logs.length === 0 && <div style={{ color: "#525252", textAlign: "center", padding: "40px" }}>NO LOGS FOUND</div>}
          </div>
        </div>

        {/* Enterprise Seat Manager */}
        <div style={{ background: "#050505", border: "1px solid #262626", borderRadius: "8px", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid #262626", background: "#0a0a0a" }}>
            <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>ENTERPRISE SEAT MANAGER</h3>
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ marginBottom: "20px" }}>
              <input 
                placeholder="User ID (UUID)" 
                value={newOverride.userId}
                onChange={(e) => setNewOverride({ ...newOverride, userId: e.target.value })}
                style={{ width: "100%", background: "#171717", border: "1px solid #262626", padding: "8px", color: "#fff", fontSize: "12px", borderRadius: "4px", marginBottom: "8px" }} 
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <input 
                  type="number" 
                  value={newOverride.seats}
                  onChange={(e) => setNewOverride({ ...newOverride, seats: parseInt(e.target.value) })}
                  style={{ flex: 1, background: "#171717", border: "1px solid #262626", padding: "8px", color: "#fff", fontSize: "12px", borderRadius: "4px" }} 
                />
                <button 
                  onClick={handleAddOverride}
                  style={{ background: "#00ff88", color: "#000", border: "none", padding: "8px 16px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                >
                  APPLY OVERRIDE
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {seatOverrides.map((override) => (
                <div key={override.userId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0a0a", padding: "8px 12px", borderRadius: "4px", border: "1px solid #171717" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#737373" }}>{override.userId.slice(0, 8)}...</div>
                    <div style={{ fontSize: "12px", color: "#00ff88", fontWeight: "bold" }}>{override.seats} SEATS</div>
                  </div>
                  <button style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: "10px", cursor: "pointer" }}>REMOVE</button>
                </div>
              ))}
              {seatOverrides.length === 0 && <div style={{ fontSize: "11px", color: "#525252", textAlign: "center", padding: "20px" }}>NO OVERRIDES ACTIVE</div>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "1fr 1fr", gap: "16px" }}>
        <div style={{ background: "#050505", border: "1px solid #262626", padding: "16px", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "14px", color: "#fff" }}>TIER QUOTAS</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Object.entries(TIER_LIMITS).map(([tier, limits]: [string, any]) => (
              <div key={tier} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "#737373" }}>{tier}</span>
                <div style={{ textAlign: "right" }}>
                   <div style={{ color: "#d4d4d4" }}>{limits.seats} Seats · {limits.buildCost} CR</div>
                   <div style={{ fontSize: "9px", color: limits.priorityCompute ? "#00ff88" : "#444" }}>{limits.priorityCompute ? "PRIORITY COMPUTE ACTIVE" : "STANDARD QUEUE"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "#050505", border: "1px solid #262626", padding: "16px", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "14px", color: "#fff" }}>PREMIUM AGENTS</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {PREMIUM_AGENTS.map((agent) => (
              <div key={agent.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "#737373" }}>{agent.name}</span>
                <span style={{ color: "#00ff88" }}>{agent.cost} CR</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginTop: "32px", background: "#050505", border: "1px solid #262626", borderRadius: "8px", overflow: "hidden" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #262626", background: "#0a0a0a" }}>
          <h2 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>MARKETPLACE MODERATION</h2>
        </div>
        <div style={{ padding: "0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#737373", borderBottom: "1px solid #262626" }}>
                <th style={{ padding: "12px 16px" }}>BLUEPRINT NAME</th>
                <th style={{ padding: "12px 16px" }}>AUTHOR</th>
                <th style={{ padding: "12px 16px" }}>PRICE</th>
                <th style={{ padding: "12px 16px" }}>STATUS</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {moderationModules.map((module) => (
                <tr key={module.id} style={{ borderBottom: "1px solid #171717" }}>
                  <td style={{ padding: "12px 16px", color: "#fff" }}>{module.name}</td>
                  <td style={{ padding: "12px 16px", color: "#737373" }}>{module.profiles?.email || module.user_id.slice(0, 8)}</td>
                  <td style={{ padding: "12px 16px", color: "#00ff88" }}>{module.price} CR</td>
                  <td style={{ padding: "12px 16px" }}>
                    {module.is_featured ? (
                      <span style={{ color: "#00ff88", background: "#00ff8810", padding: "2px 6px", borderRadius: "4px", fontSize: "10px" }}>FEATURED</span>
                    ) : (
                      <span style={{ color: "#444", fontSize: "10px" }}>STANDARD</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button 
                      onClick={() => handleToggleFeatured(module.id, module.is_featured)}
                      style={{ background: module.is_featured ? "#ef4444" : "#00ff88", color: "#000", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}
                    >
                      {module.is_featured ? "UNFEATURE" : "FEATURE"}
                    </button>
                  </td>
                </tr>
              ))}
              {moderationModules.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#444" }}>NO PUBLIC BLUEPRINTS FOR MODERATION</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ title, subtitle, active, feature }: { title: string; subtitle: string; active: boolean; feature: string }) {
  return (
    <div style={{ 
      background: "#050505", 
      border: "1px solid #262626", 
      padding: "20px", 
      borderRadius: "8px",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{ 
        position: "absolute", top: 0, right: 0, width: "40px", height: "40px", 
        background: active ? "#00ff8810" : "#ef444410",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <span style={{ color: active ? "#00ff88" : "#ef4444", fontSize: "10px" }}>{active ? "●" : "○"}</span>
      </div>
      <div style={{ fontSize: "10px", color: "#737373", letterSpacing: "0.1em", marginBottom: "4px" }}>{subtitle}</div>
      <div style={{ fontSize: "18px", fontWeight: "bold", color: "#fff", marginBottom: "12px" }}>{title}</div>
      <div style={{ fontSize: "11px", color: "#525252" }}>{feature}</div>
    </div>
  );
}

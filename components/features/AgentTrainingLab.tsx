"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";

interface TrainingModule {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  is_public: boolean;
  price: number;
  user_id: string;
  created_at: string;
}

export default function AgentTrainingLab() {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [marketplaceModules, setMarketplaceModules] = useState<TrainingModule[]>([]);
  const [featuredModules, setFeaturedModules] = useState<TrainingModule[]>([]);
  const [purchasedModuleIds, setPurchasedModuleIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"my-modules" | "marketplace" | "analytics">("my-modules");
  const [isLoading, setIsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newModule, setNewModule] = useState({
    name: "",
    description: "",
    system_prompt: "",
    price: 0,
    is_public: false
  });

  useEffect(() => {
    fetchModules();
    fetchMarketplace();
    fetchFeatured();
    fetchAnalytics();
    fetchPurchases();
  }, []);

  const fetchModules = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/agent/training");
      if (res.ok) {
        const data = await res.json();
        setModules(data.modules);
      }
    } catch (error) {
      console.error("Failed to fetch modules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMarketplace = async () => {
    try {
      const res = await fetch("/api/agent/training?public=true");
      if (res.ok) {
        const data = await res.json();
        setMarketplaceModules(data.modules);
      }
    } catch (error) {
      console.error("Failed to fetch marketplace:", error);
    }
  };

  const fetchFeatured = async () => {
    try {
      const res = await fetch("/api/agent/training?featured=true");
      if (res.ok) {
        const data = await res.json();
        setFeaturedModules(data.modules);
      }
    } catch (error) {
      console.error("Failed to fetch featured modules:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/agent/training/analytics");
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  };

  const fetchPurchases = async () => {
    // This would fetch from marketplace_purchases table
    // For now, we'll assume an empty list or implement the API if needed
  };

  const handlePurchase = async (moduleId: string) => {
    if (!confirm("Confirm purchase with credits?")) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/marketplace/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Blueprint purchased successfully!");
        setPurchasedModuleIds([...purchasedModuleIds, moduleId]);
      } else {
        alert(data.error || "Purchase failed");
      }
    } catch (error) {
      alert("Purchase error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newModule.name || !newModule.system_prompt) {
      alert("Name and System Prompt are required.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/agent/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newModule)
      });
      if (res.ok) {
        setShowCreate(false);
        setNewModule({ name: "", description: "", system_prompt: "", is_public: false });
        fetchModules();
      }
    } catch (error) {
      alert("Failed to create module");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", color: "white", fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>Agent Training Lab</h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#666" }}>Design custom behaviors andpersonas for your Nexus Prime agents.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ background: "#00ff88", color: "black", border: "none", padding: "8px 16px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Icons.Plus size={14} /> NEW MODULE
        </button>
      </div>

      {showCreate && (
        <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", padding: "24px", marginBottom: "24px", borderRadius: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px" }}>Create Custom Persona</h3>
            <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer" }}><Icons.X size={18} /></button>
          </div>
          <div style={{ display: "grid", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "10px", color: "#666", marginBottom: "8px", textTransform: "uppercase" }}>Module Name</label>
              <input
                value={newModule.name}
                onChange={(e) => setNewModule({ ...newModule, name: e.target.value })}
                placeholder="e.g., Performance Hardener"
                style={{ width: "100%", background: "#111", border: "1px solid #222", color: "white", padding: "10px", borderRadius: "4px", fontSize: "13px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "10px", color: "#666", marginBottom: "8px", textTransform: "uppercase" }}>Description</label>
              <input
                value={newModule.description}
                onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                placeholder="What does this agent specialize in?"
                style={{ width: "100%", background: "#111", border: "1px solid #222", color: "white", padding: "10px", borderRadius: "4px", fontSize: "13px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "10px", color: "#666", marginBottom: "8px", textTransform: "uppercase" }}>System Prompt (The Training)</label>
              <textarea
                value={newModule.system_prompt}
                onChange={(e) => setNewModule({ ...newModule, system_prompt: e.target.value })}
                placeholder="Provide detailed instructions for the agent's behavior, stack preferences, and constraints..."
                style={{ width: "100%", height: "120px", background: "#111", border: "1px solid #222", color: "white", padding: "10px", borderRadius: "4px", fontSize: "13px", resize: "none" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "10px", color: "#666", marginBottom: "8px", textTransform: "uppercase" }}>Blueprint Price (Credits)</label>
              <input
                type="number"
                value={newModule.price}
                onChange={(e) => setNewModule({ ...newModule, price: parseInt(e.target.value) || 0 })}
                placeholder="0 for free"
                style={{ width: "100%", background: "#111", border: "1px solid #222", color: "white", padding: "10px", borderRadius: "4px", fontSize: "13px" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="checkbox"
                checked={newModule.is_public}
                onChange={(e) => setNewModule({ ...newModule, is_public: e.target.checked })}
                id="is_public"
              />
              <label htmlFor="is_public" style={{ fontSize: "12px", color: "#999" }}>Make Public (Marketplace Ready)</label>
            </div>
            <button
              onClick={handleCreate}
              disabled={isLoading}
              style={{ background: "#00ff88", color: "black", border: "none", padding: "12px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", marginTop: "8px" }}
            >
              {isLoading ? "SAVING..." : "SAVE TRAINING MODULE (+5 CR SURCHARGE)"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid #111", marginBottom: "24px" }}>
        <button 
          onClick={() => setActiveTab("my-modules")}
          style={{ background: "none", border: "none", color: activeTab === "my-modules" ? "#00ff88" : "#444", padding: "12px 0", fontSize: "12px", fontWeight: "bold", cursor: "pointer", borderBottom: activeTab === "my-modules" ? "2px solid #00ff88" : "none" }}
        >
          MY MODULES
        </button>
        <button 
          onClick={() => setActiveTab("marketplace")}
          style={{ background: "none", border: "none", color: activeTab === "marketplace" ? "#00ff88" : "#444", padding: "12px 0", fontSize: "12px", fontWeight: "bold", cursor: "pointer", borderBottom: activeTab === "marketplace" ? "2px solid #00ff88" : "none" }}
        >
          BLUEPRINT MARKETPLACE
        </button>
        <button 
          onClick={() => setActiveTab("analytics")}
          style={{ background: "none", border: "none", color: activeTab === "analytics" ? "#00ff88" : "#444", padding: "12px 0", fontSize: "12px", fontWeight: "bold", cursor: "pointer", borderBottom: activeTab === "analytics" ? "2px solid #00ff88" : "none" }}
        >
          SALES ANALYTICS
        </button>
      </div>

      {activeTab === "analytics" && analytics && (
        <div style={{ spaceY: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
             <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", padding: "20px", borderRadius: "8px" }}>
                <div style={{ fontSize: "10px", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Total Blueprints Sold</div>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#00ff88" }}>{analytics.summary.totalSales}</div>
             </div>
             <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", padding: "20px", borderRadius: "8px" }}>
                <div style={{ fontSize: "10px", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Net Earnings (CR)</div>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#00ff88" }}>{analytics.summary.totalEarnings}</div>
             </div>
             <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", padding: "20px", borderRadius: "8px" }}>
                <div style={{ fontSize: "10px", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Active Listings</div>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#fff" }}>{analytics.summary.activeModules}</div>
             </div>
          </div>

          <div style={{ background: "#050505", border: "1px solid #1a1a1a", borderRadius: "8px", overflow: "hidden" }}>
             <div style={{ padding: "16px", background: "#0a0a0a", borderBottom: "1px solid #1a1a1a", fontSize: "12px", fontWeight: "bold" }}>RECENT TRANSACTIONS</div>
             <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#444", borderBottom: "1px solid #111" }}>
                    <th style={{ padding: "12px 16px" }}>MODULE</th>
                    <th style={{ padding: "12px 16px" }}>BUYER</th>
                    <th style={{ padding: "12px 16px" }}>AMOUNT</th>
                    <th style={{ padding: "12px 16px" }}>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentTransactions.map((tx: any) => (
                    <tr key={tx.id} style={{ borderBottom: "1px solid #0a0a0a" }}>
                      <td style={{ padding: "12px 16px", color: "#fff" }}>{analytics.modules.find((m: any) => m.id === tx.module_id)?.name || "Unknown"}</td>
                      <td style={{ padding: "12px 16px", color: "#666" }}>{tx.buyer_id.slice(0, 8)}...</td>
                      <td style={{ padding: "12px 16px", color: "#00ff88" }}>+{tx.amount - tx.platform_fee} CR</td>
                      <td style={{ padding: "12px 16px", color: "#444" }}>{new Date(tx.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {activeTab !== "analytics" && activeTab === "marketplace" && featuredModules.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Icons.Star size={16} style={{ color: "#00ff88" }} />
            <h3 style={{ margin: 0, fontSize: "14px", color: "#fff", textTransform: "uppercase", letterSpacing: "0.1em" }}>Featured Blueprints</h3>
          </div>
          <div style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "16px", scrollbarWidth: "none" }}>
            {featuredModules.map((module) => (
              <div key={module.id} style={{ minWidth: "280px", background: "linear-gradient(135deg, #0a0a0a 0%, #050505 100%)", border: "1px solid #00ff8844", padding: "20px", borderRadius: "8px", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, right: 0, padding: "8px", background: "#00ff8822", borderBottomLeftRadius: "8px", fontSize: "9px", color: "#00ff88", fontWeight: "bold" }}>FEATURED</div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", color: "#00ff88" }}>
                    <Icons.Zap size={18} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: "14px" }}>{module.name}</h4>
                </div>
                <p style={{ margin: "0 0 16px 0", fontSize: "11px", color: "#888", height: "33px", overflow: "hidden" }}>{module.description}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#00ff88", fontWeight: "bold" }}>{module.price} CR</span>
                  <button 
                    onClick={() => handlePurchase(module.id)}
                    disabled={isLoading}
                    style={{ background: "#00ff88", color: "black", border: "none", padding: "6px 16px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    {isLoading ? "..." : "GET NOW"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
        {activeTab !== "analytics" && (activeTab === "my-modules" ? modules : marketplaceModules).map((module) => (
          <div key={module.id} style={{ background: "#050505", border: "1px solid #1a1a1a", padding: "20px", borderRadius: "8px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, padding: "8px", background: "#1a1a1a", borderBottomLeftRadius: "8px", fontSize: "10px", color: "#666" }}>
              {activeTab === "my-modules" ? (module.is_public ? "PUBLIC" : "PRIVATE") : `${module.price} CR`}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", color: "#00ff88" }}>
                <Icons.Brain size={18} />
              </div>
              <h4 style={{ margin: 0, fontSize: "14px" }}>{module.name}</h4>
            </div>
            <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#666", lineHeight: "1.5" }}>{module.description || "No description provided."}</p>
            <div style={{ borderTop: "1px solid #111", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: "#444" }}>{activeTab === "my-modules" ? `CREATED ${new Date(module.created_at).toLocaleDateString()}` : "COMMUNITY BLUEPRINT"}</span>
              <div style={{ display: "flex", gap: "12px" }}>
                {activeTab === "my-modules" ? (
                  <>
                    <button style={{ background: "none", border: "none", color: "#00ff88", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>EDIT</button>
                    <button style={{ background: "none", border: "none", color: "#ff4444", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>DELETE</button>
                  </>
                ) : (
                  <button 
                    onClick={() => handlePurchase(module.id)}
                    disabled={isLoading}
                    style={{ background: "#00ff88", color: "black", border: "none", padding: "4px 12px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    {isLoading ? "..." : "PURCHASE ACCESS"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {modules.length === 0 && !isLoading && !showCreate && (
          <div style={{ gridColumn: "1 / -1", padding: "64px", textAlign: "center", border: "1px dashed #222", borderRadius: "12px" }}>
            <Icons.Cpu size={40} style={{ color: "#222", marginBottom: "16px" }} />
            <h3 style={{ margin: 0, color: "#444" }}>No custom modules yet.</h3>
            <p style={{ margin: "8px 0 0 0", color: "#333", fontSize: "12px" }}>Train your first specialist agent to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

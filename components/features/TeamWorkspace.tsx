"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TIER_LIMITS } from "@/lib/nexus_prime_constants";

interface Team {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  ownerId: string;
  settings: Record<string, unknown>;
  createdAt: string;
}

interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: "owner" | "admin" | "editor" | "viewer";
  invitedBy?: string;
  acceptedAt?: string;
  profile?: { email: string; displayName?: string; avatarUrl?: string };
}

interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  acceptedAt?: string;
}

interface ActivityItem {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  userId: string;
  projectId?: string;
  user?: { displayName?: string; email: string; avatarUrl?: string };
}

interface TeamWorkspaceProps {
  userId: string;
}

const ROLE_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  owner: { color: "#f59e0b", bg: "#78350f", label: "Owner", icon: "👑" },
  admin: { color: "#ef4444", bg: "#7f1d1d", label: "Admin", icon: "🔧" },
  editor: { color: "#6366f1", bg: "#1e1b4b", label: "Editor", icon: "✏️" },
  viewer: { color: "#737373", bg: "#262626", label: "Viewer", icon: "👁️" },
};

const ACTION_LABELS: Record<string, { icon: string; label: string }> = {
  "project.created": { icon: "📁", label: "created a project" },
  "project.updated": { icon: "📝", label: "updated project" },
  "project.deleted": { icon: "🗑️", label: "deleted a project" },
  "file.created": { icon: "📄", label: "created a file" },
  "file.updated": { icon: "💾", label: "updated a file" },
  "file.deleted": { icon: "🗑️", label: "deleted a file" },
  "version.created": { icon: "📸", label: "created a version" },
  "version.rollback": { icon: "⏪", label: "rolled back version" },
  "review.requested": { icon: "🔍", label: "requested code review" },
  "review.completed": { icon: "✅", label: "completed code review" },
  "deploy.started": { icon: "🚀", label: "started deployment" },
  "deploy.completed": { icon: "✅", label: "deployment succeeded" },
  "deploy.failed": { icon: "❌", label: "deployment failed" },
  "member.invited": { icon: "📨", label: "invited a member" },
  "member.joined": { icon: "🎉", label: "joined the team" },
  "member.removed": { icon: "👋", label: "was removed" },
  "team.created": { icon: "🏢", label: "created the team" },
  "team.updated": { icon: "⚙️", label: "updated team settings" },
};

export default function TeamWorkspace({ userId }: TeamWorkspaceProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activeTab, setActiveTab] = useState<"members" | "activity" | "settings">("members");
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer" | "admin">("editor");
  const [isLoading, setIsLoading] = useState(false);
  const [ownerTier, setOwnerTier] = useState<string>("Free");
  const [seatLimit, setSeatLimit] = useState<number>(1);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchTeams();
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (activeTeam) {
      fetchMembers(activeTeam.id);
      fetchActivity(activeTeam.id);
      fetchInvites(activeTeam.id);
      fetchOwnerTier(activeTeam.ownerId);
    }
  }, [activeTeam]);

  const fetchOwnerTier = async (ownerId: string) => {
    try {
      const res = await fetch(`/api/user/tier?userId=${ownerId}`);
      if (res.ok) {
        const data = await res.json();
        setOwnerTier(data.tier);
        setSeatLimit(data.seatLimit);
      }
    } catch (error) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to fetch owner tier:", error);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) setTeams(await res.json());
    } catch (error) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to fetch teams:", error);
    }
  };

  const fetchMembers = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`);
      if (res.ok) setMembers(await res.json());
    } catch (error) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to fetch members:", error);
    }
  };

  const fetchInvites = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/invites`);
      if (res.ok) setInvites(await res.json());
    } catch (error) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to fetch invites:", error);
    }
  };

  const fetchActivity = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/activity`);
      if (res.ok) setActivity(await res.json());
    } catch (error) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to fetch activity:", error);
    }
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    setIsLoading(true);
    try {
      const slug = newTeamName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName, slug }),
      });
      if (res.ok) {
        const team: Team = await res.json();
        setTeams((prev) => [...prev, team]);
        setActiveTeam(team);
        setShowCreateTeam(false);
        setNewTeamName("");
      }
    } catch (error) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to create team:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !activeTeam) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/teams/${activeTeam.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        await fetchInvites(activeTeam.id);
        setShowInvite(false);
        setInviteEmail("");
      }
    } catch (error) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to send invite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    if (!activeTeam) return;
    try {
      await fetch(`/api/teams/${activeTeam.id}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      await fetchMembers(activeTeam.id);
    } catch (error) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to update role:", error);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!activeTeam) return;
    try {
      await fetch(`/api/teams/${activeTeam.id}/members/${memberId}`, { method: "DELETE" });
      await fetchMembers(activeTeam.id);
    } catch (error) {
      // PROD FIX: Removed console.error for production
      // console.error("Failed to remove member:", error);
    }
  };

  const currentUserRole = members.find((m) => m.userId === userId)?.role;
  const canManage = currentUserRole === "owner" || currentUserRole === "admin";

  return (
    <div style={{ display: "flex", height: "100%", background: "#0a0a0a", color: "#e5e5e5", position: "relative" }}>
      {/* Sidebar - Team List */}
      <div style={{ 
        width: sidebarOpen ? "240px" : "0px", 
        borderRight: sidebarOpen ? "1px solid #262626" : "none", 
        display: "flex", flexDirection: "column",
        transition: "all 0.3s ease",
        overflow: "hidden",
        position: isMobile && sidebarOpen ? "absolute" : "relative",
        zIndex: 100,
        height: "100%",
        background: "#0a0a0a",
      }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #262626", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>👥 Teams</h2>
          <button
            onClick={() => setShowCreateTeam(true)}
            style={{
              width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #262626",
              background: "#171717", color: "#a5b4fc", cursor: "pointer", fontSize: "16px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            +
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => setActiveTeam(team)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid",
                borderColor: activeTeam?.id === team.id ? "#6366f1" : "transparent",
                background: activeTeam?.id === team.id ? "#1e1b4b" : "transparent",
                color: activeTeam?.id === team.id ? "#a5b4fc" : "#d4d4d4",
                cursor: "pointer", textAlign: "left", marginBottom: "4px", fontSize: "13px",
                display: "flex", alignItems: "center", gap: "8px",
              }}
            >
              <span style={{ fontSize: "16px" }}>{team.avatarUrl || "🏢"}</span>
              {team.name}
            </button>
          ))}

          {teams.length === 0 && !showCreateTeam && (
            <div style={{ textAlign: "center", padding: "30px 10px", color: "#525252", fontSize: "13px" }}>
              <p>No teams yet</p>
              <button
                onClick={() => setShowCreateTeam(true)}
                style={{
                  padding: "8px 16px", borderRadius: "8px", border: "1px solid #262626",
                  background: "#171717", color: "#a5b4fc", cursor: "pointer", fontSize: "13px",
                }}
              >
                Create Team
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!activeTeam && !showCreateTeam ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#525252" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>👥</div>
              <p style={{ fontSize: "16px" }}>Select a team or create a new one</p>
            </div>
          </div>
        ) : showCreateTeam ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: window.innerWidth < 640 ? "90%" : "400px", padding: "32px", borderRadius: "16px", background: "#171717", border: "1px solid #262626" }}>
              <h3 style={{ margin: "0 0 24px", fontSize: "18px", fontWeight: 600 }}>Create Team</h3>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team name"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "8px",
                  border: "1px solid #262626", background: "#0a0a0a",
                  color: "#e5e5e5", fontSize: "14px", marginBottom: "16px",
                  boxSizing: "border-box",
                }}
                onKeyDown={(e) => e.key === "Enter" && createTeam()}
                autoFocus
              />
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setShowCreateTeam(false); setNewTeamName(""); }}
                  style={{
                    padding: "8px 16px", borderRadius: "8px", border: "1px solid #262626",
                    background: "transparent", color: "#737373", cursor: "pointer", fontSize: "13px",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={createTeam}
                  disabled={!newTeamName.trim() || isLoading}
                  style={{
                    padding: "8px 20px", borderRadius: "8px", border: "none",
                    background: newTeamName.trim() ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#262626",
                    color: newTeamName.trim() ? "#fff" : "#525252",
                    cursor: newTeamName.trim() ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: 600,
                  }}
                >
                  {isLoading ? "Creating..." : "Create Team"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Team header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {isMobile && (
                  <button 
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    style={{ background: "transparent", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" }}
                  >
                    ☰
                  </button>
                )}
                <span style={{ fontSize: "24px" }}>🏢</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>{activeTeam?.name}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", color: "#737373" }}>
                      {members.length + invites.filter(i => !i.acceptedAt).length} / {seatLimit} Seats Used
                    </span>
                    <div style={{ width: "60px", height: "4px", background: "#171717", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{
                        width: `${Math.min(100, ((members.length + invites.filter(i => !i.acceptedAt).length) / seatLimit) * 100)}%`,
                        height: "100%",
                        background: "#00ff88"
                      }} />
                    </div>
                    {currentUserRole && <span style={{ fontSize: "12px", color: "#525252" }}> · {ROLE_CONFIG[currentUserRole].icon} {ROLE_CONFIG[currentUserRole].label}</span>}
                  </div>
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => setShowInvite(true)}
                  style={{
                    padding: "8px 16px", borderRadius: "8px", border: "none",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 600,
                  }}
                >
                  + Invite
                </button>
              )}
            </div>


            {/* Tabs */}
            <div style={{ padding: "0 20px", borderBottom: "1px solid #262626", display: "flex", gap: "24px" }}>
              {(["members", "activity", "settings"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "12px 0", border: "none", background: "none",
                    color: activeTab === tab ? "#a5b4fc" : "#737373",
                    borderBottom: `2px solid ${activeTab === tab ? "#6366f1" : "transparent"}`,
                    cursor: "pointer", fontSize: "13px", fontWeight: 500,
                    textTransform: "capitalize",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
              {activeTab === "members" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {members.map((member) => {
                    const roleConfig = ROLE_CONFIG[member.role];
                    return (
                      <div
                        key={member.id}
                        style={{
                          padding: "12px 16px", borderRadius: "10px",
                          background: "#171717", border: "1px solid #262626",
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{
                            width: "36px", height: "36px", borderRadius: "50%",
                            background: "#262626", display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: "16px",
                          }}>
                            {member.profile?.avatarUrl ? (
                              <img
                                src={member.profile.avatarUrl}
                                alt=""
                                style={{ width: "36px", height: "36px", borderRadius: "50%" }}
                              />
                            ) : (
                              "👤"
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 500 }}>
                              {member.profile?.displayName || member.profile?.email || "Unknown"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#525252" }}>
                              {member.profile?.email}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{
                            padding: "2px 10px", borderRadius: "12px", fontSize: "11px",
                            background: roleConfig.bg, color: roleConfig.color,
                          }}>
                            {roleConfig.icon} {roleConfig.label}
                          </span>
                          {canManage && member.role !== "owner" && member.userId !== userId && (
                            <div style={{ display: "flex", gap: "4px" }}>
                              <select
                                value={member.role}
                                onChange={(e) => updateMemberRole(member.id, e.target.value)}
                                style={{
                                  background: "#0a0a0a", border: "1px solid #262626",
                                  borderRadius: "6px", color: "#a3a3a3", padding: "4px 8px",
                                  fontSize: "11px", cursor: "pointer",
                                }}
                              >
                                <option value="admin">Admin</option>
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <button
                                onClick={() => removeMember(member.id)}
                                style={{
                                  padding: "4px 8px", borderRadius: "6px",
                                  border: "1px solid #7f1d1d", background: "transparent",
                                  color: "#ef4444", cursor: "pointer", fontSize: "11px",
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Pending invites */}
                  {invites.filter((i) => !i.acceptedAt).length > 0 && (
                    <>
                      <h4 style={{ margin: "16px 0 8px", fontSize: "12px", color: "#737373" }}>Pending Invites</h4>
                      {invites.filter((i) => !i.acceptedAt).map((invite) => (
                        <div
                          key={invite.id}
                          style={{
                            padding: "10px 16px", borderRadius: "10px",
                            background: "#171717", border: "1px dashed #262626",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <span style={{ fontSize: "13px", color: "#a3a3a3" }}>📨 {invite.email}</span>
                            <span style={{ fontSize: "11px", color: "#525252", marginLeft: "8px" }}>
                              {ROLE_CONFIG[invite.role]?.label || invite.role}
                            </span>
                          </div>
                          <span style={{ fontSize: "11px", color: "#525252" }}>
                            Expires {new Date(invite.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {activeTab === "activity" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {activity.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#525252" }}>
                      <p>No activity yet</p>
                    </div>
                  ) : (
                    activity.map((item) => {
                      const actionConfig = ACTION_LABELS[item.action] || { icon: "📌", label: item.action };
                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: "10px 14px", borderRadius: "8px",
                            background: "#171717", display: "flex", alignItems: "center", gap: "10px",
                          }}
                        >
                          <span style={{ fontSize: "14px" }}>{actionConfig.icon}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: "13px" }}>
                              <strong style={{ color: "#d4d4d4" }}>
                                {item.user?.displayName || item.user?.email || "Someone"}
                              </strong>{" "}
                              <span style={{ color: "#737373" }}>{actionConfig.label}</span>
                              {(item.metadata as any)?.projectName && (
                                <span style={{ color: "#a5b4fc" }}> in {String((item.metadata as any).projectName)}</span>
                              )}
                            </span>
                            <div style={{ fontSize: "11px", color: "#525252", marginTop: "2px" }}>
                              {new Date(item.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === "settings" && canManage && (
                <div style={{ maxWidth: "500px" }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 600 }}>Team Settings</h3>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "12px", color: "#737373", marginBottom: "6px" }}>
                      Team Name
                    </label>
                    <input
                      type="text"
                      defaultValue={activeTeam?.name}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: "8px",
                        border: "1px solid #262626", background: "#171717",
                        color: "#e5e5e5", fontSize: "14px", boxSizing: "border-box",
                      }}
                    />
                  </div>
                  {currentUserRole === "owner" && (
                    <div style={{ marginTop: "32px", padding: "16px", borderRadius: "10px", border: "1px solid #7f1d1d" }}>
                      <h4 style={{ margin: "0 0 8px", fontSize: "13px", color: "#ef4444" }}>Danger Zone</h4>
                      <p style={{ fontSize: "12px", color: "#737373", margin: "0 0 12px" }}>
                        Deleting this team will remove all shared projects and members.
                      </p>
                      <button
                        style={{
                          padding: "8px 16px", borderRadius: "8px",
                          border: "1px solid #ef4444", background: "transparent",
                          color: "#ef4444", cursor: "pointer", fontSize: "13px",
                        }}
                      >
                        Delete Team
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Invite Modal */}
        {showInvite && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
          }}>
            <div style={{
              width: window.innerWidth < 640 ? "90%" : "420px", padding: "24px", borderRadius: "16px",
              background: "#171717", border: "1px solid #262626",
            }}>
              <h3 style={{ margin: "0 0 20px", fontSize: "16px" }}>Invite Member</h3>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "8px",
                  border: "1px solid #262626", background: "#0a0a0a",
                  color: "#e5e5e5", fontSize: "14px", marginBottom: "12px",
                  boxSizing: "border-box",
                }}
                autoFocus
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "editor" | "viewer")}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "8px",
                  border: "1px solid #262626", background: "#0a0a0a",
                  color: "#e5e5e5", fontSize: "14px", marginBottom: "16px",
                  boxSizing: "border-box", cursor: "pointer",
                }}
              >
                <option value="admin">Admin — Full access</option>
                <option value="editor">Editor — Can edit projects</option>
                <option value="viewer">Viewer — Read-only access</option>
              </select>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setShowInvite(false); setInviteEmail(""); }}
                  style={{
                    padding: "8px 16px", borderRadius: "8px", border: "1px solid #262626",
                    background: "transparent", color: "#737373", cursor: "pointer", fontSize: "13px",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={sendInvite}
                  disabled={!inviteEmail.trim() || isLoading}
                  style={{
                    padding: "8px 20px", borderRadius: "8px", border: "none",
                    background: inviteEmail.trim() ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#262626",
                    color: inviteEmail.trim() ? "#fff" : "#525252",
                    cursor: inviteEmail.trim() ? "pointer" : "not-allowed",
                    fontSize: "13px", fontWeight: 600,
                  }}
                >
                  {isLoading ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

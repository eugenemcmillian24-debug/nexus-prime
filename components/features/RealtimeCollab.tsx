"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor?: { line: number; column: number };
  selection?: { start: { line: number; column: number }; end: { line: number; column: number } };
  activeFile?: string;
  lastSeen: string;
  status: "online" | "idle" | "offline";
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
  type: "message" | "system" | "code";
  fileRef?: string;
  lineRef?: number;
}

interface RealtimeCollabProps {
  projectId: string;
  userId: string;
  userName: string;
  currentFile?: string;
}

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function RealtimeCollab({ projectId, userId, userName, currentFile }: RealtimeCollabProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState<"people" | "chat" | "activity">("people");
  const [isConnected, setIsConnected] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    connectWebSocket();
    return () => { wsRef.current?.close(); };
  }, [projectId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const connectWebSocket = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/collab/${projectId}`);

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({
        type: "join",
        userId,
        userName,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "presence":
          setCollaborators(data.collaborators);
          break;
        case "cursor":
          setCollaborators((prev) =>
            prev.map((c) => c.id === data.userId ? { ...c, cursor: data.cursor, activeFile: data.file } : c)
          );
          break;
        case "selection":
          setCollaborators((prev) =>
            prev.map((c) => c.id === data.userId ? { ...c, selection: data.selection } : c)
          );
          break;
        case "chat":
          setChatMessages((prev) => [...prev, data.message]);
          break;
        case "system":
          setChatMessages((prev) => [...prev, {
            id: crypto.randomUUID(),
            userId: "system",
            userName: "System",
            text: data.message,
            timestamp: new Date().toISOString(),
            type: "system",
          }]);
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setTimeout(connectWebSocket, 3000);
    };

    wsRef.current = ws;
  };

  const sendCursorPosition = useCallback((line: number, column: number) => {
    wsRef.current?.send(JSON.stringify({
      type: "cursor",
      userId,
      cursor: { line, column },
      file: currentFile,
    }));
  }, [userId, currentFile]);

  const sendChat = () => {
    if (!chatInput.trim()) return;

    const isCodeRef = chatInput.startsWith("/code ");
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      userId,
      userName,
      text: isCodeRef ? chatInput.slice(6) : chatInput,
      timestamp: new Date().toISOString(),
      type: isCodeRef ? "code" : "message",
      fileRef: currentFile,
      lineRef: isCodeRef ? parseInt(chatInput.split(":")[1]) || undefined : undefined,
    };

    wsRef.current?.send(JSON.stringify({ type: "chat", message }));
    setChatInput("");
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await fetch(`/api/collab/${projectId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      setInviteEmail("");
      setShowInvite(false);
    } catch (err) {
      console.error("Invite failed:", err);
    }
  };

  const onlineCount = collaborators.filter((c) => c.status === "online").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a", color: "#e5e5e5", width: "280px", borderLeft: "1px solid #262626" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #262626" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: isConnected ? "#10b981" : "#ef4444",
            }} />
            <span style={{ fontSize: "13px", fontWeight: 600 }}>Live Collaboration</span>
          </div>
          <span style={{ fontSize: "11px", color: "#525252" }}>{onlineCount} online</span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px" }}>
          {(["people", "chat", "activity"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: "6px", borderRadius: "6px", border: "none",
                background: activeTab === tab ? "#1e1b4b" : "transparent",
                color: activeTab === tab ? "#a5b4fc" : "#525252",
                cursor: "pointer", fontSize: "12px", textTransform: "capitalize",
              }}
            >
              {tab === "chat" && chatMessages.length > 0 ? `Chat (${chatMessages.length})` : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeTab === "people" && (
          <div style={{ padding: "8px" }}>
            {/* Avatars stack */}
            <div style={{ display: "flex", padding: "8px", gap: "-4px", marginBottom: "8px" }}>
              {collaborators.filter((c) => c.status === "online").slice(0, 8).map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    width: "32px", height: "32px", borderRadius: "50%",
                    background: c.color, border: "2px solid #0a0a0a",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: 700, color: "#fff",
                    marginLeft: i > 0 ? "-8px" : "0", zIndex: 10 - i,
                  }}
                  title={c.name}
                >
                  {c.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>

            {/* Collaborator list */}
            {collaborators.map((collab) => (
              <div
                key={collab.id}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "8px 10px", borderRadius: "8px", marginBottom: "4px",
                  background: collab.id === userId ? "#171717" : "transparent",
                }}
              >
                <div style={{ position: "relative" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: collab.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 700, color: "#fff",
                  }}>
                    {collab.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{
                    position: "absolute", bottom: "-1px", right: "-1px",
                    width: "10px", height: "10px", borderRadius: "50%",
                    border: "2px solid #0a0a0a",
                    background: collab.status === "online" ? "#10b981" : collab.status === "idle" ? "#f59e0b" : "#525252",
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 500 }}>
                    {collab.name} {collab.id === userId && <span style={{ color: "#525252" }}>(you)</span>}
                  </div>
                  <div style={{ fontSize: "11px", color: "#525252", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {collab.activeFile ? `Editing ${collab.activeFile}` : "Idle"}
                  </div>
                </div>
                {collab.cursor && (
                  <span style={{ fontSize: "10px", color: collab.color, fontFamily: "monospace" }}>
                    L{collab.cursor.line}
                  </span>
                )}
              </div>
            ))}

            {/* Invite button */}
            <button
              onClick={() => setShowInvite(!showInvite)}
              style={{
                width: "100%", padding: "10px", borderRadius: "8px",
                border: "1px dashed #262626", background: "transparent",
                color: "#6366f1", cursor: "pointer", fontSize: "12px",
                marginTop: "8px",
              }}
            >
              + Invite collaborator
            </button>
            {showInvite && (
              <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  style={{
                    flex: 1, padding: "8px", borderRadius: "6px",
                    border: "1px solid #262626", background: "#171717",
                    color: "#e5e5e5", fontSize: "12px",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                />
                <button
                  onClick={sendInvite}
                  style={{
                    padding: "8px 12px", borderRadius: "6px", border: "none",
                    background: "#6366f1", color: "#fff", cursor: "pointer", fontSize: "12px",
                  }}
                >
                  Send
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "#3f3f46", fontSize: "12px" }}>
                  No messages yet. Start a conversation!
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} style={{ marginBottom: "8px" }}>
                    {msg.type === "system" ? (
                      <div style={{ fontSize: "11px", color: "#525252", textAlign: "center", padding: "4px" }}>
                        {msg.text}
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: "flex", gap: "6px", alignItems: "baseline", marginBottom: "2px" }}>
                          <span style={{
                            fontSize: "12px", fontWeight: 600,
                            color: collaborators.find((c) => c.id === msg.userId)?.color || "#a3a3a3",
                          }}>
                            {msg.userName}
                          </span>
                          <span style={{ fontSize: "10px", color: "#3f3f46" }}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {msg.type === "code" ? (
                          <pre style={{
                            margin: 0, padding: "8px", borderRadius: "6px",
                            background: "#171717", border: "1px solid #262626",
                            fontSize: "11px", color: "#d4d4d4", whiteSpace: "pre-wrap",
                          }}>
                            {msg.text}
                          </pre>
                        ) : (
                          <div style={{ fontSize: "13px", lineHeight: 1.4, color: "#d4d4d4" }}>
                            {msg.text}
                          </div>
                        )}
                        {msg.fileRef && (
                          <div style={{ fontSize: "10px", color: "#6366f1", marginTop: "2px" }}>
                            📎 {msg.fileRef}{msg.lineRef ? `:${msg.lineRef}` : ""}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ padding: "8px", borderTop: "1px solid #262626" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Message... (/code for code)"
                  style={{
                    flex: 1, padding: "8px 10px", borderRadius: "8px",
                    border: "1px solid #262626", background: "#171717",
                    color: "#e5e5e5", fontSize: "12px",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                />
                <button
                  onClick={sendChat}
                  style={{
                    padding: "8px 12px", borderRadius: "8px", border: "none",
                    background: chatInput.trim() ? "#6366f1" : "#262626",
                    color: chatInput.trim() ? "#fff" : "#525252",
                    cursor: chatInput.trim() ? "pointer" : "default", fontSize: "14px",
                  }}
                >
                  ↑
                </button>
              </div>
              <div style={{ fontSize: "10px", color: "#3f3f46", marginTop: "4px" }}>
                Tip: Use <code>/code</code> prefix for code snippets
              </div>
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div style={{ padding: "8px" }}>
            <div style={{ textAlign: "center", padding: "40px 16px", color: "#3f3f46", fontSize: "12px" }}>
              Live activity feed shows edits, saves, and file changes in real time.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

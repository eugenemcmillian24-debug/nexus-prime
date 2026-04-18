"use client";

import React, { memo, useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Users, 
  MessageSquare, 
  Activity, 
  Send, 
  Code2, 
  UserPlus, 
  Circle,
  Hash,
  AtSign
} from "lucide-react";
import { cn } from "@/lib/utils";

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

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
}

function RealtimeCollab({ projectId, userId, userName, currentFile }: RealtimeCollabProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState<"people" | "chat" | "activity">("people");
  const [isConnected, setIsConnected] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase.channel(`project:${projectId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as any[];
        setCollaborators(users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email || "",
          color: u.color,
          status: "online",
          activeFile: u.activeFile,
          cursor: u.cursor,
          lastSeen: new Date().toISOString()
        })));
      })
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        setChatMessages(prev => [...prev, payload]);
      })
      .on("broadcast", { event: "cursor" }, ({ payload }) => {
        setCollaborators(prev => prev.map(c => 
          c.id === payload.userId ? { ...c, cursor: payload.cursor, activeFile: payload.file } : c
        ));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          await channel.track({
            id: userId,
            name: userName,
            color: stringToColor(userId),
            activeFile: currentFile,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [projectId]);

  useEffect(() => {
    if (channelRef.current && isConnected) {
      channelRef.current.track({
        id: userId,
        name: userName,
        activeFile: currentFile,
      });
    }
  }, [currentFile, isConnected]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendCursorPosition = useCallback((line: number, column: number) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "cursor",
      payload: { userId, cursor: { line, column }, file: currentFile }
    });
  }, [userId, currentFile]);

  const sendChat = () => {
    if (!chatInput.trim()) return;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      userId,
      userName,
      text: chatInput,
      timestamp: new Date().toISOString(),
      type: "message",
      fileRef: currentFile,
    };

    channelRef.current?.send({
      type: "broadcast",
      event: "chat",
      payload: message
    });
    
    setChatMessages(prev => [...prev, message]);
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
    <div className="flex flex-col h-full bg-[#050505] text-[#e5e5e5] font-mono text-sm border-l border-white/10 w-full max-w-[280px]">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-[#080808]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full shadow-[0_0_8px]",
              isConnected ? "bg-[#00ff88] shadow-[#00ff88/40]" : "bg-red-500 shadow-red-500/40"
            )} />
            <h2 className="font-bold tracking-tighter uppercase text-[11px]">Live Sequence</h2>
          </div>
          <span className="text-[10px] text-white/20 uppercase font-bold">{onlineCount} Sync'd</span>
        </div>

        {/* Tabs */}
        <div className="flex bg-black/40 p-1 rounded-sm">
          {(["people", "chat", "activity"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all rounded-sm",
                activeTab === tab ? "bg-[#1a1a1a] text-[#00ff88]" : "text-white/20 hover:text-white/40"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === "people" && (
          <div className="p-2 space-y-1">
            {collaborators.map((collab) => (
              <div
                key={collab.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-sm transition-colors",
                  collab.id === userId ? "bg-[#00ff88]/5 border border-[#00ff88]/10" : "hover:bg-white/5"
                )}
              >
                <div className="relative">
                  <div 
                    className="w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold text-black"
                    style={{ background: collab.color }}
                  >
                    {collab.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#050505]",
                    collab.status === "online" ? "bg-[#00ff88]" : "bg-white/20"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[11px] truncate text-white/80">{collab.name}</span>
                    {collab.id === userId && <span className="text-[8px] text-[#00ff88] font-bold uppercase tracking-tighter">[You]</span>}
                  </div>
                  <p className="text-[9px] text-white/20 truncate uppercase tracking-tighter">
                    {collab.activeFile ? `Editing: ${collab.activeFile.split('/').pop()}` : "Idle"}
                  </p>
                </div>
              </div>
            ))}

            <button
              onClick={() => setShowInvite(!showInvite)}
              className="w-full mt-4 p-3 border border-dashed border-white/10 rounded-sm text-[10px] text-white/40 uppercase tracking-widest hover:border-[#00ff8833] hover:text-[#00ff88] transition-all flex items-center justify-center gap-2 group"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Invite Architect
            </button>

            {showInvite && (
              <div className="mt-2 flex gap-1 p-1 bg-black/40 border border-white/5 rounded-sm">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="ID Sequence..."
                  className="flex-1 bg-transparent border-none outline-none text-[10px] p-2 text-white/60"
                />
                <button
                  onClick={sendInvite}
                  className="bg-[#00ff88] text-black px-3 rounded-sm font-bold text-[10px]"
                >
                  Sync
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-10 space-y-2">
                  <MessageSquare className="w-8 h-8" />
                  <p className="text-[10px] uppercase tracking-widest">No Transmissions</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-[10px] font-bold uppercase tracking-tighter"
                        style={{ color: collaborators.find((c) => c.id === msg.userId)?.color || "#888" }}
                      >
                        {msg.userName}
                      </span>
                      <span className="text-[8px] text-white/10">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-[12px] text-white/60 leading-relaxed bg-white/5 p-2 rounded-sm border border-white/5">
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-white/10 bg-[#080808]">
              <div className="flex gap-2 p-1.5 bg-black rounded-sm border border-white/5 focus-within:border-[#00ff88/30] transition-colors">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Communicate..."
                  className="flex-1 bg-transparent border-none outline-none text-[11px] px-2 py-1 text-white/80"
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                />
                <button
                  onClick={sendChat}
                  disabled={!chatInput.trim()}
                  className="p-1.5 bg-white/5 hover:bg-[#00ff88] text-white/20 hover:text-black rounded-sm transition-all disabled:opacity-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 bg-[#080808] flex items-center justify-between opacity-20 grayscale">
        <Users className="w-4 h-4" />
        <MessageSquare className="w-4 h-4" />
        <Activity className="w-4 h-4" />
      </div>
    </div>
  );
}

export default memo(RealtimeCollab);

"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Users, 
  Send, 
  ShieldCheck, 
  Layout, 
  Settings2, 
  Loader2, 
  MessageSquare, 
  Brain,
  History,
  X,
  Plus
} from "lucide-react";

interface Message {
  agent: string;
  content: string;
  timestamp: string;
}

interface WarRoomProps {
  projectId: string;
  onPlanConfirmed?: (plan: string) => void;
}

const AGENT_ICONS: Record<string, any> = {
  Architect: Settings2,
  "UI/UX Designer": Layout,
  "Security Analyst": ShieldCheck,
  User: Users,
};

const AGENT_COLORS: Record<string, string> = {
  Architect: "#6366f1",
  "UI/UX Designer": "#00ff88",
  "Security Analyst": "#ef4444",
  User: "#737373",
};

export default function WarRoom({ projectId, onPlanConfirmed }: WarRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { agent: "User", content: input, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/agent/war-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, jobId, projectId }),
      });

      if (!response.ok) throw new Error("Debate failed.");

      const data = await response.json();
      setJobId(data.jobId);
      
      const newMessages = data.debate.map((m: any) => ({
        ...m,
        timestamp: new Date().toISOString()
      }));

      setMessages((prev) => [...prev, ...newMessages]);
    } catch (error) {
      console.error("War Room Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    setJobId(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-[#e5e5e5] font-mono border-l border-[#1a1a1a]">
      {/* Header */}
      <div className="p-6 border-b border-[#1a1a1a] flex justify-between items-center bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00ff8811] border border-[#00ff8822] rounded-sm flex items-center justify-center text-[#00ff88]">
            <Users size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-widest uppercase">The War Room</h2>
            <p className="text-[9px] text-[#444] uppercase tracking-widest">Multi-Agent Strategic Planning</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={clearHistory}
            className="p-2 text-[#444] hover:text-[#ff4444] transition-colors"
            title="Clear Session"
          >
            <History size={14} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-auto p-6 space-y-8 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-xs mx-auto">
            <div className="w-16 h-16 bg-[#111] border border-[#1a1a1a] rounded-full flex items-center justify-center text-[#222]">
              <Brain size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#444] uppercase tracking-widest">Initialize Strategic Debate</h3>
              <p className="text-[10px] text-[#333] leading-relaxed uppercase">
                Submit a high-level requirement. Our Architect, UI Designer, and Security Analyst will debate the implementation plan.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const Icon = AGENT_ICONS[msg.agent] || MessageSquare;
            const color = AGENT_COLORS[msg.agent] || "#737373";
            return (
              <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-6 h-6 rounded-sm flex items-center justify-center text-white"
                    style={{ background: `${color}22`, border: `1px solid ${color}44` }}
                  >
                    <Icon size={12} style={{ color }} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                    {msg.agent}
                  </span>
                  <span className="text-[8px] text-[#222] ml-auto">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="pl-8 text-[11px] text-[#a3a3a3] leading-relaxed whitespace-pre-wrap border-l border-[#1a1a1a] ml-3">
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        {isLoading && (
          <div className="flex items-center gap-3 pl-3">
            <div className="w-6 h-6 animate-spin flex items-center justify-center text-[#444]">
              <Loader2 size={12} />
            </div>
            <span className="text-[9px] text-[#444] uppercase tracking-widest animate-pulse">
              Agents are debating...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-[#1a1a1a] bg-[#0a0a0a]">
        <form onSubmit={handleSend} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="PROPOSE A FEATURE OR SYSTEM REQUIREMENT..."
            className="w-full bg-[#050505] border border-[#1a1a1a] p-4 pr-12 text-[11px] text-white outline-none focus:border-[#00ff8833] transition-colors resize-none custom-scrollbar min-h-[80px]"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute bottom-4 right-4 p-2 bg-[#00ff8811] text-[#00ff88] hover:bg-[#00ff8822] disabled:opacity-30 transition-all rounded-sm"
          >
            <Send size={16} />
          </button>
        </form>
        <div className="mt-3 flex justify-between items-center text-[8px] text-[#222] uppercase tracking-widest">
          <span>Shift + Enter for newline</span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={8} /> End-to-End Encrypted
          </span>
        </div>
      </div>
    </div>
  );
}

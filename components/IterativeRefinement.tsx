"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Wand2, RotateCcw } from "lucide-react";

interface RefinementMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface IterativeRefinementProps {
  jobId: string;
  userId: string;
  currentCode: any;
  onNewBuild: (newJobResult: any) => void;
}

export default function IterativeRefinement({
  jobId,
  userId,
  currentCode,
  onNewBuild,
}: IterativeRefinementProps) {
  const [messages, setMessages] = useState<RefinementMessage[]>([]);
  const [input, setInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleRefine = async () => {
    if (!input.trim() || isRefining) return;

    const userMessage: RefinementMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsRefining(true);

    try {
      const response = await fetch("/api/agent/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          parentJobId: jobId,
          refinementPrompt: userMessage.content,
          currentCode: JSON.stringify(currentCode),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Refinement failed");
      }

      const assistantMessage: RefinementMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `✅ Applied changes. ${data.changedFiles || 0} file(s) updated.`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.result) {
        onNewBuild(data.result);
      }
    } catch (err: any) {
      const errorMessage: RefinementMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `❌ ${err.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsRefining(false);
    }
  };

  const suggestions = [
    "Make the header sticky with a blur effect",
    "Add dark/light mode toggle",
    "Make it fully responsive for mobile",
    "Add smooth scroll animations",
    "Change the color scheme to blue",
  ];

  return (
    <div className="border border-[#1a1a1a] bg-[#0a0a0a] rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a1a1a]">
        <Wand2 className="w-4 h-4 text-[#00ff88]" />
        <span className="text-xs text-[#888] uppercase tracking-widest font-bold">
          Iterative Refinement
        </span>
      </div>

      {/* Messages */}
      <div className="max-h-[300px] overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <p className="text-[#444] text-sm mb-4">
              Describe changes to refine your build
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 border border-[#222] text-[#666] hover:text-[#00ff88] hover:border-[#00ff88]/30 rounded-sm transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-sm text-sm ${
                msg.role === "user"
                  ? "bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20"
                  : "bg-[#111] text-[#888] border border-[#1a1a1a]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isRefining && (
          <div className="flex items-center gap-2 text-[#444] text-sm">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Refining build...</span>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t border-[#1a1a1a]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRefine()}
          placeholder="e.g. Make the buttons bigger and add hover animations..."
          className="flex-1 bg-[#111] border border-[#222] text-white text-sm px-3 py-2 rounded-sm placeholder:text-[#333] focus:outline-none focus:border-[#00ff88]/50"
          disabled={isRefining}
        />
        <button
          onClick={handleRefine}
          disabled={isRefining || !input.trim()}
          className="p-2 bg-[#00ff88] text-black rounded-sm hover:bg-[#00cc6a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {isRefining ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

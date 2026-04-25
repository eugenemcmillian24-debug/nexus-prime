"use client";

import { useState } from "react";
import { Cpu, ChevronDown, Zap, Brain, Eye, Shield } from "lucide-react";

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description: string;
  speed: "fast" | "medium" | "slow";
  quality: "standard" | "high" | "premium";
  creditCost: number;
  icon: typeof Brain;
}

const REASONER_MODELS: ModelOption[] = [
  { id: "minimax-m2.5-free", name: "Minimax M2.5", provider: "Zen", description: "Default free reasoning", speed: "fast", quality: "standard", creditCost: 0, icon: Brain },
  { id: "nemotron-3-super-free", name: "Nemotron 3 Super", provider: "Zen", description: "Balanced free reasoning", speed: "medium", quality: "high", creditCost: 0, icon: Brain },
  { id: "gpt-4o", name: "GPT-4o", provider: "Zen", description: "Premium paid reasoning", speed: "fast", quality: "premium", creditCost: 15, icon: Brain },
];

const CODER_MODELS: ModelOption[] = [
  { id: "hy3-preview-free", name: "HY3 Preview", provider: "Zen", description: "Fast free coding", speed: "fast", quality: "standard", creditCost: 0, icon: Zap },
  { id: "big-pickle", name: "Big Pickle", provider: "Zen", description: "Capable free coding", speed: "medium", quality: "high", creditCost: 0, icon: Zap },
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "Zen", description: "Best-in-class coding", speed: "slow", quality: "premium", creditCost: 25, icon: Zap },
];

const VISION_MODELS: ModelOption[] = [
  { id: "ling-2.6-flash", name: "Ling 2.6 Flash", provider: "Zen", description: "Fast free vision", speed: "fast", quality: "high", creditCost: 0, icon: Eye },
  { id: "deepseek-v3", name: "DeepSeek V3", provider: "Zen", description: "Advanced visual analysis", speed: "medium", quality: "premium", creditCost: 15, icon: Eye },
];

const speedColors = { fast: "text-[#00ff88]", medium: "text-[#ffaa00]", slow: "text-[#ff4444]" };
const qualityBadges = {
  standard: "bg-[#333] text-[#888]",
  high: "bg-[#00ff8811] text-[#00ff88]",
  premium: "bg-[#ffaa0011] text-[#ffaa00]",
};

export interface ModelSelection {
  reasoner: string;
  coder: string;
  vision: string;
}

export default function ModelSelector({
  selection = { reasoner: "minimax-m2.5-free", coder: "hy3-preview-free", vision: "ling-2.6-flash" },
  onChange = () => {},
}: {
  selection?: ModelSelection;
  onChange?: (selection: ModelSelection) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const renderModelGroup = (title: string, models: ModelOption[], key: keyof ModelSelection, Icon: typeof Brain) => {
    const selected = models.find((m) => m.id === selection[key]) || models[0];
    const isExpanded = expanded === key;

    return (
      <div className="border border-[#1a1a1a] rounded-[2px] overflow-hidden">
        <button
          onClick={() => setExpanded(isExpanded ? null : key)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-[#080808] hover:bg-[#0c0c0c] transition-all"
        >
          <div className="flex items-center gap-2">
            <Icon size={12} className="text-[#00ff88]" />
            <span className="text-[9px] uppercase font-bold tracking-widest text-[#666]">{title}</span>
            <span className="text-[10px] text-white font-mono">{selected.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[8px] font-bold uppercase ${speedColors[selected.speed]}`}>{selected.speed}</span>
            <ChevronDown size={10} className={`text-[#444] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-[#1a1a1a] bg-[#050505]">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onChange({ ...selection, [key]: model.id });
                  setExpanded(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 transition-all border-b border-[#0a0a0a] last:border-0 ${
                  model.id === selection[key]
                    ? "bg-[#00ff8808] border-l-2 border-l-[#00ff88]"
                    : "hover:bg-[#0a0a0a]"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white font-mono">{model.name}</span>
                    <span className="text-[8px] text-[#333] font-mono">{model.provider}</span>
                  </div>
                  <div className="text-[9px] text-[#444] mt-0.5">{model.description}</div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className={`px-1.5 py-0.5 text-[7px] uppercase font-bold rounded-[2px] ${qualityBadges[model.quality]}`}>
                    {model.quality}
                  </span>
                  <span className="text-[9px] text-[#444] font-mono">{model.creditCost}cr</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const totalCost =
    (REASONER_MODELS.find((m) => m.id === selection.reasoner)?.creditCost || 0) +
    (CODER_MODELS.find((m) => m.id === selection.coder)?.creditCost || 0) +
    (VISION_MODELS.find((m) => m.id === selection.vision)?.creditCost || 0);

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
      <div className="p-3 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-[#00ff88]" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-white">Model Pipeline</span>
        </div>
        <span className="text-[9px] text-[#444] font-mono">
          Est. cost: <span className="text-[#00ff88]">{totalCost} credits</span>
        </span>
      </div>

      <div className="p-3 space-y-2">
        {renderModelGroup("Reasoner", REASONER_MODELS, "reasoner", Brain)}
        {renderModelGroup("Coder", CODER_MODELS, "coder", Zap)}
        {renderModelGroup("Vision", VISION_MODELS, "vision", Eye)}
      </div>
    </div>
  );
}

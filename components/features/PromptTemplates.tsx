"use client";

import { useState, useEffect } from "react";
import { Sparkles, Clock, Flame, Search, Plus, Heart, Copy, ChevronDown } from "lucide-react";

interface Template {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
  tags: string[];
  is_system: boolean;
  usage_count: number;
}

const CATEGORIES = [
  { value: "all", label: "All Templates" },
  { value: "landing", label: "Landing Pages" },
  { value: "dashboard", label: "Dashboards" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "portfolio", label: "Portfolios" },
  { value: "saas", label: "SaaS" },
  { value: "mobile", label: "Mobile" },
  { value: "custom", label: "Custom" },
];

export default function PromptTemplates({
  onSelectTemplate,
  userId,
  supabase,
}: {
  onSelectTemplate: (prompt: string) => void;
  userId: string;
  supabase: any;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ title: "", description: "", prompt: "", category: "custom" });

  useEffect(() => {
    fetchTemplates();
  }, [category]);

  const fetchTemplates = async () => {
    setLoading(true);
    let query = supabase
      .from("prompt_templates")
      .select("*")
      .or(`user_id.eq.${userId},is_public.eq.true,is_system.eq.true`)
      .order("usage_count", { ascending: false });

    if (category !== "all") query = query.eq("category", category);
    
    const { data } = await query;
    setTemplates(data || []);
    setLoading(false);
  };

  const handleUseTemplate = async (template: Template) => {
    onSelectTemplate(template.prompt);
    await supabase
      .from("prompt_templates")
      .update({ usage_count: template.usage_count + 1 })
      .eq("id", template.id);
  };

  const handleSaveTemplate = async () => {
    if (!newTemplate.title || !newTemplate.prompt) return;
    await supabase.from("prompt_templates").insert({
      ...newTemplate,
      user_id: userId,
      is_public: false,
      is_system: false,
    });
    setShowCreate(false);
    setNewTemplate({ title: "", description: "", prompt: "", category: "custom" });
    fetchTemplates();
  };

  const filtered = templates.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#00ff88]" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-white">Prompt Templates</span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 px-2 py-1 text-[9px] uppercase font-bold tracking-widest text-[#00ff88] border border-[#00ff8833] rounded-[2px] hover:bg-[#00ff8811] transition-all"
        >
          <Plus size={10} /> Save New
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="p-4 border-b border-[#1a1a1a] bg-[#080808] space-y-3">
          <input
            type="text"
            placeholder="Template name..."
            value={newTemplate.title}
            onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
            className="w-full bg-[#111] border border-[#1a1a1a] rounded-[2px] px-3 py-2 text-xs text-white placeholder:text-[#333] focus:border-[#00ff8844] outline-none"
          />
          <textarea
            placeholder="Paste your prompt here..."
            value={newTemplate.prompt}
            onChange={(e) => setNewTemplate({ ...newTemplate, prompt: e.target.value })}
            rows={3}
            className="w-full bg-[#111] border border-[#1a1a1a] rounded-[2px] px-3 py-2 text-xs text-white placeholder:text-[#333] focus:border-[#00ff8844] outline-none resize-none"
          />
          <div className="flex gap-2">
            <select
              value={newTemplate.category}
              onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
              className="bg-[#111] border border-[#1a1a1a] rounded-[2px] px-2 py-1 text-[10px] text-[#888] outline-none"
            >
              {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <button
              onClick={handleSaveTemplate}
              className="ml-auto px-3 py-1 bg-[#00ff88] text-black text-[10px] font-bold uppercase rounded-[2px] hover:bg-[#00cc6d] transition-all"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-3 border-b border-[#1a1a1a] flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#333]" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111] border border-[#1a1a1a] rounded-[2px] pl-7 pr-3 py-1.5 text-[10px] text-white placeholder:text-[#333] focus:border-[#00ff8844] outline-none"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-2 py-1 text-[9px] uppercase font-bold tracking-wider rounded-[2px] transition-all ${
                category === c.value
                  ? "bg-[#00ff8822] text-[#00ff88] border border-[#00ff8844]"
                  : "text-[#444] hover:text-[#888] border border-transparent"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="col-span-2 text-center py-8 text-[#333] text-xs">Loading templates...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-[#333] text-xs">No templates found</div>
        ) : (
          filtered.map((template) => (
            <button
              key={template.id}
              onClick={() => handleUseTemplate(template)}
              className="text-left p-3 bg-[#080808] border border-[#1a1a1a] rounded-[2px] hover:border-[#00ff8833] hover:bg-[#0c0c0c] transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-white truncate">{template.title}</div>
                  <div className="text-[9px] text-[#444] mt-1 line-clamp-2">{template.description}</div>
                </div>
                {template.is_system && (
                  <span className="shrink-0 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-[#00ff8811] text-[#00ff88] rounded-[2px]">
                    Built-in
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[8px] text-[#333]">
                <span className="flex items-center gap-1">
                  <Flame size={8} /> {template.usage_count} uses
                </span>
                <span className="uppercase tracking-wider">{template.category}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

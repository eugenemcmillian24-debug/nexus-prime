"use client";

import { useState, useEffect } from "react";
import { Blocks, Search, Plus, Heart, Code, Eye, Copy, Check, Tag } from "lucide-react";

interface SavedComponent {
  id: string;
  name: string;
  description: string;
  code: string;
  tags: string[];
  category: string;
  is_public: boolean;
  usage_count: number;
  likes_count: number;
}

const COMPONENT_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "ui", label: "UI Elements" },
  { value: "layout", label: "Layouts" },
  { value: "form", label: "Forms" },
  { value: "data", label: "Data Display" },
  { value: "navigation", label: "Navigation" },
  { value: "animation", label: "Animations" },
];

export default function ComponentLibrary({
  userId,
  supabase,
  onInsertComponent,
}: {
  userId: string;
  supabase: any;
  onInsertComponent: (code: string) => void;
}) {
  const [components, setComponents] = useState<SavedComponent[]>([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSave, setShowSave] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [newComponent, setNewComponent] = useState({
    name: "",
    description: "",
    code: "",
    category: "ui",
    tags: "",
    is_public: false,
  });

  useEffect(() => {
    fetchComponents();
  }, [category]);

  const fetchComponents = async () => {
    setLoading(true);
    let query = supabase
      .from("saved_components")
      .select("*")
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .order("usage_count", { ascending: false });

    if (category !== "all") query = query.eq("category", category);

    const { data } = await query;
    setComponents(data || []);
    setLoading(false);
  };

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async () => {
    if (!newComponent.name || !newComponent.code) return;
    await supabase.from("saved_components").insert({
      user_id: userId,
      name: newComponent.name,
      description: newComponent.description,
      code: newComponent.code,
      category: newComponent.category,
      tags: newComponent.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
      is_public: newComponent.is_public,
    });
    setShowSave(false);
    setNewComponent({ name: "", description: "", code: "", category: "ui", tags: "", is_public: false });
    fetchComponents();
  };

  const handleInsert = async (component: SavedComponent) => {
    onInsertComponent(component.code);
    await supabase
      .from("saved_components")
      .update({ usage_count: component.usage_count + 1 })
      .eq("id", component.id);
  };

  const filtered = components.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase()) ||
      c.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Blocks size={14} className="text-[#00ff88]" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-white">Component Library</span>
          <span className="text-[9px] text-[#333] font-mono">{components.length}</span>
        </div>
        <button
          onClick={() => setShowSave(!showSave)}
          className="flex items-center gap-1 px-2 py-1 text-[9px] uppercase font-bold tracking-widest text-[#00ff88] border border-[#00ff8833] rounded-[2px] hover:bg-[#00ff8811] transition-all"
        >
          <Plus size={10} /> Save Component
        </button>
      </div>

      {/* Save Form */}
      {showSave && (
        <div className="p-4 border-b border-[#1a1a1a] bg-[#080808] space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Component name..."
              value={newComponent.name}
              onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
              className="bg-[#111] border border-[#1a1a1a] rounded-[2px] px-3 py-2 text-xs text-white placeholder:text-[#333] focus:border-[#00ff8844] outline-none"
            />
            <select
              value={newComponent.category}
              onChange={(e) => setNewComponent({ ...newComponent, category: e.target.value })}
              className="bg-[#111] border border-[#1a1a1a] rounded-[2px] px-2 py-2 text-xs text-[#888] outline-none"
            >
              {COMPONENT_CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Paste component code..."
            value={newComponent.code}
            onChange={(e) => setNewComponent({ ...newComponent, code: e.target.value })}
            rows={4}
            className="w-full bg-[#111] border border-[#1a1a1a] rounded-[2px] px-3 py-2 text-xs text-white placeholder:text-[#333] focus:border-[#00ff8844] outline-none resize-none font-mono"
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Tags (comma separated)..."
              value={newComponent.tags}
              onChange={(e) => setNewComponent({ ...newComponent, tags: e.target.value })}
              className="flex-1 bg-[#111] border border-[#1a1a1a] rounded-[2px] px-3 py-1.5 text-[10px] text-white placeholder:text-[#333] focus:border-[#00ff8844] outline-none"
            />
            <label className="flex items-center gap-1 text-[9px] text-[#444]">
              <input
                type="checkbox"
                checked={newComponent.is_public}
                onChange={(e) => setNewComponent({ ...newComponent, is_public: e.target.checked })}
                className="accent-[#00ff88]"
              />
              Public
            </label>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-[#00ff88] text-black text-[10px] font-bold uppercase rounded-[2px] hover:bg-[#00cc6d] transition-all"
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
            placeholder="Search components..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111] border border-[#1a1a1a] rounded-[2px] pl-7 pr-3 py-1.5 text-[10px] text-white placeholder:text-[#333] focus:border-[#00ff8844] outline-none"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {COMPONENT_CATEGORIES.map((c) => (
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

      {/* Component List */}
      <div className="max-h-[350px] overflow-y-auto custom-scrollbar divide-y divide-[#0f0f0f]">
        {loading ? (
          <div className="p-8 text-center text-[#333] text-xs animate-pulse">Loading components...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-[#333] text-xs">No components found. Save your first one!</div>
        ) : (
          filtered.map((component) => (
            <div key={component.id} className="p-3 hover:bg-[#080808] transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white">{component.name}</span>
                    <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 bg-[#111] text-[#444] rounded-[2px]">
                      {component.category}
                    </span>
                  </div>
                  {component.description && (
                    <div className="text-[9px] text-[#444] mt-1">{component.description}</div>
                  )}
                  {component.tags?.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {component.tags.map((tag) => (
                        <span key={tag} className="flex items-center gap-0.5 text-[8px] text-[#333] bg-[#111] px-1.5 py-0.5 rounded-[2px]">
                          <Tag size={7} /> {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setPreview(preview === component.id ? null : component.id)}
                    className="p-1.5 text-[#444] hover:text-[#00ff88] hover:bg-[#00ff8811] rounded-[2px] transition-all"
                    title="Preview code"
                  >
                    <Eye size={12} />
                  </button>
                  <button
                    onClick={() => handleCopy(component.id, component.code)}
                    className="p-1.5 text-[#444] hover:text-[#00ff88] hover:bg-[#00ff8811] rounded-[2px] transition-all"
                    title="Copy code"
                  >
                    {copied === component.id ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                  <button
                    onClick={() => handleInsert(component)}
                    className="px-2 py-1 text-[9px] uppercase font-bold text-[#00ff88] border border-[#00ff8833] rounded-[2px] hover:bg-[#00ff8811] transition-all"
                  >
                    Insert
                  </button>
                </div>
              </div>

              {/* Code Preview */}
              {preview === component.id && (
                <pre className="mt-2 p-3 bg-[#050505] border border-[#1a1a1a] rounded-[2px] text-[10px] text-[#666] font-mono overflow-x-auto max-h-[200px] custom-scrollbar">
                  <code>{component.code}</code>
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

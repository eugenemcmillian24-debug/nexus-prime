"use client";

import React, { useState, useEffect } from "react";
import { 
  SandpackProvider, 
  SandpackLayout, 
  SandpackPreview, 
  SandpackCodeEditor,
  SandpackFileExplorer
} from "@codesandbox/sandpack-react";
import { 
  Loader2, 
  Settings2, 
  Play, 
  Code2, 
  Maximize2, 
  Download,
  Terminal,
  Zap,
  RefreshCw,
  Sliders
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PropField {
  name: string;
  type: string;
  optional: boolean;
  defaultValue: any;
  options?: string[];
}

interface ComponentPlaygroundProps {
  projectId: string;
  componentPath: string;
}

export default function ComponentPlayground({ projectId, componentPath }: ComponentPlaygroundProps) {
  const [loading, setLoading] = useState(true);
  const [propSchema, setPropSchema] = useState<PropField[]>([]);
  const [currentProps, setCurrentProps] = useState<Record<string, any>>({});
  const [fileContent, setFileContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComponentData();
  }, [componentPath]);

  const loadComponentData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch file content
      const filesRes = await fetch(`/api/projects/files?project_id=${projectId}`);
      const filesData = await filesRes.json();
      const file = filesData.files.find((f: any) => f.path === componentPath);
      if (!file) throw new Error("Component file not found");
      setFileContent(file.content);

      // 2. Parse props via AI
      const propsRes = await fetch("/api/agent/props", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, filePath: componentPath }),
      });
      const propsData = await propsRes.json();
      setPropSchema(propsData.props || []);
      
      // Initialize default props
      const defaults: Record<string, any> = {};
      propsData.props?.forEach((p: PropField) => {
        defaults[p.name] = p.defaultValue;
      });
      setCurrentProps(defaults);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePropChange = (name: string, value: any) => {
    setCurrentProps(prev => ({ ...prev, [name]: value }));
  };

  // Generate the preview code that imports and renders the component
  const componentName = componentPath.split("/").pop()?.replace(/\.(tsx|jsx|ts|js)$/, "") || "Component";
  
  const entryCode = `
import React from "react";
import { ${componentName} } from "./Component";

export default function App() {
  return (
    <div style={{ padding: "2rem", background: "#050505", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <${componentName} ${Object.entries(currentProps)
        .map(([k, v]) => {
          if (typeof v === "string") return `${k}="${v}"`;
          if (typeof v === "boolean") return v ? k : "";
          return `${k}={${JSON.stringify(v)}}`;
        })
        .filter(Boolean)
        .join(" ")} />
    </div>
  );
}
  `.trim();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#00ff88]" />
        <p className="text-[10px] uppercase tracking-[0.4em]">Calibrating Playground...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#050505] overflow-hidden border-t border-white/5">
      {/* Prop Controls Sidebar */}
      <div className="w-80 border-r border-white/10 flex flex-col bg-[#080808]">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#00ff88]" />
            <span className="font-bold text-[10px] uppercase tracking-widest">Live Attributes</span>
          </div>
          <button onClick={loadComponentData} className="p-1 hover:bg-white/5 rounded-sm">
            <RefreshCw className="w-3 h-3 text-white/40" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {propSchema.map((prop) => (
            <div key={prop.name} className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-white/60 uppercase tracking-tighter">{prop.name}</label>
                <span className="text-[8px] text-white/20 font-mono">{prop.type}</span>
              </div>

              {prop.options ? (
                <select 
                  value={currentProps[prop.name]}
                  onChange={(e) => handlePropChange(prop.name, e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-sm p-2 text-xs text-white/80 focus:border-[#00ff88] outline-none"
                >
                  {prop.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : prop.type.toLowerCase().includes("boolean") ? (
                <button 
                  onClick={() => handlePropChange(prop.name, !currentProps[prop.name])}
                  className={cn(
                    "w-full py-2 border rounded-sm text-[10px] font-bold uppercase transition-all",
                    currentProps[prop.name] ? "bg-[#00ff88] border-[#00ff88] text-black" : "border-white/10 text-white/40 hover:border-white/20"
                  )}
                >
                  {currentProps[prop.name] ? "True" : "False"}
                </button>
              ) : (
                <input 
                  type="text"
                  value={currentProps[prop.name] || ""}
                  onChange={(e) => handlePropChange(prop.name, e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-sm p-2 text-xs text-white/80 focus:border-[#00ff88] outline-none"
                />
              )}
            </div>
          ))}
          
          {propSchema.length === 0 && (
            <div className="py-20 text-center opacity-20">
              <p className="text-[10px] uppercase">No Dynamic Props Detected</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-black/40">
          <button onClick={() => {
            const blob = new Blob([JSON.stringify({ component: componentPath, props: currentProps }, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${componentPath || "component"}-module.json`;
            a.click();
            URL.revokeObjectURL(url);
          }} className="w-full py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-[#00ff88] transition-all flex items-center justify-center gap-2">
            <Download className="w-3 h-3" /> Export Module
          </button>
        </div>
      </div>

      {/* Main Sandbox Area */}
      <div className="flex-1 flex flex-col relative">
        <SandpackProvider
          theme="dark"
          template="react-ts"
          files={{
            "/App.tsx": entryCode,
            "/Component.tsx": fileContent,
          }}
          options={{
            externalResources: ["https://cdn.tailwindcss.com"],
          }}
        >
          <div className="flex-1 flex flex-col">
            <div className="h-1/2 border-b border-white/10 bg-black/20">
              <SandpackPreview 
                showNavigator={false} 
                showOpenInCodeSandbox={false}
                style={{ height: "100%", background: "transparent" }}
              />
            </div>
            <div className="h-1/2 bg-[#050505]">
              <SandpackCodeEditor 
                showTabs={false} 
                showLineNumbers={true}
                style={{ height: "100%" }}
              />
            </div>
          </div>
        </SandpackProvider>

        {/* Floating Badges */}
        <div className="absolute top-4 right-4 flex gap-2 pointer-events-none">
          <div className="bg-[#00ff88]/10 border border-[#00ff88]/20 px-3 py-1 rounded-full flex items-center gap-2 backdrop-blur-md">
            <Zap className="w-3 h-3 text-[#00ff88]" />
            <span className="text-[9px] font-bold text-[#00ff88] uppercase tracking-widest">Real-time Sandbox</span>
          </div>
        </div>
      </div>
    </div>
  );
}

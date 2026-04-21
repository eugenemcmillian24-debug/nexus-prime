"use client";

import { useState } from "react";
import Login from "@/components/Login";
import { 
  Zap, 
  Shield, 
  Cpu, 
  Layers, 
  Code2, 
  Terminal as TerminalIcon, 
  History, 
  Globe,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

const FEATURES = [
  {
    icon: Cpu,
    title: "Multi-Agent Orchestration",
    description: "Specialized AI agents work in parallel to design, architect, and code your application from a single prompt."
  },
  {
    icon: Code2,
    title: "Visual Synthesis",
    description: "Upload screenshots or sketches. Our vision models extract layout and logic to scaffold production-ready components."
  },
  {
    icon: Layers,
    title: "Iterative Refinement",
    description: "Don't start over. Use our chat interface to refine specific parts of your build with context-aware suggestions."
  },
  {
    icon: TerminalIcon,
    title: "Real-time Execution",
    description: "Watch your app being built in a live terminal environment with full log transparency and error handling."
  },
  {
    icon: History,
    title: "Versioned Snapshots",
    description: "Every build is automatically versioned. Roll back, fork, or compare different iterations with ease."
  },
  {
    icon: Globe,
    title: "One-Click Deployment",
    description: "Deploy your generated apps instantly to Vercel, Netlify, or Cloudflare with optimized production builds."
  },
  {
    icon: Shield,
    title: "Secure Key Management",
    description: "Securely manage and rotate API keys for Groq, OpenRouter, and Gemini with enterprise-grade encryption."
  },
  {
    icon: Zap,
    title: "Component Marketplace",
    description: "Discover, share, and fork high-quality community templates and UI components to accelerate your workflow."
  },
  {
    icon: Layers,
    title: "Team Workspaces",
    description: "Collaborate with your team in real-time. Share projects, track changes, and manage organization-wide usage."
  }
];

const PRICING = [
  {
    name: "Starter",
    price: "$9",
    credits: "100",
    description: "Perfect for individual developers and rapid prototyping.",
    features: ["10 Build Executions", "Community Templates", "Basic Support", "Standard Models"]
  },
  {
    name: "PRO",
    price: "$29",
    credits: "500",
    description: "For power users building complex, multi-page applications.",
    features: ["50 Build Executions", "All Seed Templates", "Priority Processing", "Advanced Reasoning Models", "Custom Deployment Hooks"]
  },
  {
    name: "Enterprise",
    price: "$99",
    credits: "2000",
    description: "Maximum scale for teams and professional studios.",
    features: ["200 Build Executions", "Team Workspaces", "24/7 Priority Support", "White-label Deployments", "API Access"]
  }
];

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  if (showAuth) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative">
        <div className="fixed inset-0 grid-bg opacity-10 pointer-events-none" />
        <div className="absolute top-8 left-8 z-10">
          <button
            onClick={() => setShowAuth(false)}
            className="flex items-center gap-2 text-[10px] font-bold text-[#444] uppercase tracking-widest hover:text-[#00ff88] transition-colors"
          >
            <ArrowRight size={10} className="rotate-180" /> Back to Overview
          </button>
        </div>
        <Login />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#a3a3a3] font-sans selection:bg-[#00ff8822] selection:text-[#00ff88] overflow-x-hidden">
      {/* Dynamic Grid Background */}
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-[#050505] to-[#050505] pointer-events-none" />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl p-4 md:p-6 transition-all">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-[#00ff88] rounded-xl flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(0,255,136,0.3)] group-hover:scale-110 transition-transform">N</div>
            <div>
              <h1 className="text-white text-lg font-bold tracking-tight">NEXUS PRIME</h1>
              <div className="text-[8px] text-[#00ff88] tracking-[0.3em] font-mono">AUTONOMOUS FORGE</div>
            </div>
          </div>
          <div className="hidden md:flex gap-10 text-[11px] font-bold uppercase tracking-[0.15em] items-center">
            <a href="#features" className="hover:text-white transition-colors">Architecture</a>
            <a href="#pricing" className="hover:text-white transition-colors">Allocation</a>
            <button
              onClick={() => setShowAuth(true)}
              className="bg-white text-black px-6 py-2.5 rounded-full font-bold hover:bg-[#00ff88] transition-all shadow-xl hover:shadow-[0_0_30px_rgba(0,255,136,0.2)]"
            >
              Initialize System
            </button>
          </div>
          <button className="md:hidden text-white" onClick={() => setShowAuth(true)}>
            <Zap size={20} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-[#00ff8808] blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center space-y-10 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00ff8833] bg-[#00ff880a] text-[#00ff88] text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-ping" />
            LATEST VERSION 2.4 STABLE
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.85] uppercase">
            Build Software at<br />
            <span className="text-gradient">The Speed of Thought</span>
          </h1>
          
          <p className="text-lg md:text-xl text-[#525252] font-medium leading-relaxed max-w-2xl mx-auto text-balance">
            The world's first multi-agent orchestration engine. We don't just generate code; we architect, refine, and deploy complete production ecosystems in seconds.
          </p>
          
          <div className="flex flex-col md:flex-row gap-6 justify-center pt-6">
            <button
              onClick={() => setShowAuth(true)}
              className="group bg-[#00ff88] text-black px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 hover:scale-105 transition-all shadow-[0_20px_40px_rgba(0,255,136,0.2)]"
            >
              Start Build Sequence <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
            </button>
            <a
              href="#features"
              className="bg-white/5 border border-white/10 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all backdrop-blur-md"
            >
              Technical Specs
            </a>
          </div>

          {/* Visual Placeholder for "Software Factory" */}
          <div className="mt-20 relative mx-auto max-w-4xl rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-4 backdrop-blur-sm group">
            <div className="aspect-video rounded-2xl bg-[#000] border border-white/5 flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 grid-bg opacity-10" />
              <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="flex gap-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-12 h-12 rounded-lg bg-[#00ff8811] border border-[#00ff8822] flex items-center justify-center text-[#00ff88] animate-bounce" style={{animationDelay: `${i*0.2}s`}}>
                      <Code2 size={24} />
                    </div>
                  ))}
                </div>
                <div className="text-[10px] font-mono text-[#00ff88] tracking-[0.5em] uppercase">Orchestrating Agents...</div>
              </div>
              <div className="absolute bottom-6 left-6 right-6 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#00ff88] w-2/3 shadow-[0_0_15px_rgba(0,255,136,0.5)]" />
              </div>
            </div>
            {/* Floaties */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#00ff8811] rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
          </div>
        </div>
      </section>

      {/* Trust/Stats Bar */}
      <div className="border-y border-white/5 bg-black/40 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "Network Uptime", val: "99.99%" },
            { label: "Lines Orchestrated", val: "12.4M+" },
            { label: "Deploy Latency", val: "420ms" },
            { label: "Global Nodes", val: "2,400+" }
          ].map((s, i) => (
            <div key={i} className="text-center space-y-1 border-r last:border-0 border-white/5">
              <div className="text-2xl font-black text-white">{s.val}</div>
              <div className="text-[9px] font-bold text-[#444] uppercase tracking-[0.2em]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="max-w-2xl space-y-4">
            <h2 className="text-[#00ff88] text-xs font-black tracking-[0.4em] uppercase">Core Architecture</h2>
            <h3 className="text-4xl md:text-5xl text-white font-black tracking-tighter uppercase leading-none">
              Built for Professional<br />Engineering Velocity
            </h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div key={i} className="group relative p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all hover:-translate-y-2 overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <feature.icon size={80} />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#111] border border-white/10 flex items-center justify-center text-[#00ff88] shadow-inner mb-6 group-hover:scale-110 group-hover:bg-[#00ff88] group-hover:text-black transition-all">
                  <feature.icon size={24} />
                </div>
                <h4 className="text-white text-lg font-bold tracking-tight mb-3 uppercase">{feature.title}</h4>
                <p className="text-sm text-[#525252] leading-relaxed font-medium">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6 relative bg-gradient-to-b from-transparent to-black/40">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-[#00ff88] text-xs font-black tracking-[0.4em] uppercase">Infrastructure Access</h2>
            <h3 className="text-4xl md:text-6xl text-white font-black tracking-tighter uppercase">Predictable Scaling</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 items-end">
            {PRICING.map((tier, i) => (
              <div key={i} className={`relative p-12 rounded-[40px] border flex flex-col gap-10 transition-all hover:shadow-[0_40px_80px_rgba(0,0,0,0.5)] ${
                i === 1 
                ? 'border-[#00ff8844] bg-[#0a0a0a] scale-105 z-10 shadow-[0_0_50px_rgba(0,255,136,0.1)]' 
                : 'border-white/5 bg-white/[0.02]'
              }`}>
                {i === 1 && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#00ff88] text-black px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Most Deployed
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="text-xs font-black text-[#525252] tracking-widest uppercase">{tier.name} Protocol</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-white tracking-tighter">{tier.price}</span>
                    <span className="text-sm font-bold text-[#444]">/MO</span>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="text-[10px] font-black text-[#444] uppercase tracking-widest text-center">Compute Tokens</div>
                  <div className="text-3xl font-black text-[#00ff88] text-center tracking-tighter">{tier.credits}</div>
                </div>

                <div className="space-y-4 flex-1">
                  {tier.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-4 text-[11px] font-bold text-[#a3a3a3] uppercase tracking-wide">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]/30 border border-[#00ff88]" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowAuth(true)}
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all ${
                    i === 1 
                    ? 'bg-[#00ff88] text-black hover:bg-[#00cc6d] shadow-lg shadow-[#00ff88]/20' 
                    : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                  }`}
                >
                  Allocate Resources
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-32 pb-16 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#00ff88] rounded-lg flex items-center justify-center text-black font-black">N</div>
                <h1 className="text-white text-lg font-bold">NEXUS PRIME</h1>
              </div>
              <p className="text-sm text-[#444] max-w-xs font-medium leading-relaxed uppercase tracking-wider">
                Automating the global software manufacturing pipeline through advanced multi-agent intelligence.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
              {[
                { title: "Platform", links: ["Architecture", "Blueprints", "Runtime", "Security"] },
                { title: "Network", links: ["Nodes", "Latency", "Compliance", "Uptime"] },
                { title: "Company", links: ["Operations", "Privacy", "Terms", "Support"] }
              ].map((col, i) => (
                <div key={i} className="space-y-6">
                  <h5 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">{col.title}</h5>
                  <ul className="space-y-4">
                    {col.links.map((link, j) => (
                      <li key={j}>
                        <a href="#" className="text-[10px] font-bold text-[#444] uppercase tracking-widest hover:text-[#00ff88] transition-colors">{link}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          
          <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-bold text-[#222] uppercase tracking-[0.3em]">
            <span>© 2026 NEXUS PRIME CORP // GLOBAL OPERATIONS</span>
            <div className="flex gap-8">
              <span>EST. 2024</span>
              <span>LHR // SFO // TYO</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );

}

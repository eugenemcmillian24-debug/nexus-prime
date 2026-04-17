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
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="absolute top-8 left-8">
          <button 
            onClick={() => setShowAuth(false)}
            className="text-[10px] text-[#444] uppercase tracking-widest hover:text-white transition-colors"
          >
            [ ← Return to Intelligence Overview ]
          </button>
        </div>
        <Login />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#888] font-mono selection:bg-[#00ff8822] selection:text-[#00ff88]">
      {/* Navigation */}
      <nav className="border-b border-[#1a1a1a] p-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00ff88] rounded-sm flex items-center justify-center text-black font-bold">N</div>
            <h1 className="text-white text-lg font-bold tracking-widest uppercase">Nexus Prime</h1>
          </div>
          <div className="flex gap-8 text-[10px] uppercase tracking-[0.2em] items-center">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <button 
              onClick={() => setShowAuth(true)}
              className="bg-[#00ff88] text-black px-4 py-2 font-bold hover:bg-[#00cc6d] transition-all"
            >
              Initialize System
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 px-6 border-b border-[#1a1a1a]">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#00ff8833] bg-[#00ff8805] text-[#00ff88] text-[10px] uppercase tracking-[0.3em]">
            <Zap size={12} /> Version 2.4 Active
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter uppercase leading-[0.9]">
            The Multi-Agent<br />
            <span className="text-[#00ff88]">Software Factory</span>
          </h1>
          <p className="text-sm md:text-base text-[#444] uppercase tracking-widest leading-relaxed max-w-2xl mx-auto">
            From raw thought to production deployment. Nexus Prime orchestrates a swarm of specialized AI agents to architect, code, and deploy your applications in seconds.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center pt-8">
            <button 
              onClick={() => setShowAuth(true)}
              className="bg-[#00ff88] text-black px-8 py-4 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-[#00cc6d] transition-all"
            >
              Start Build Sequence <ArrowRight size={14} />
            </button>
            <a 
              href="#features"
              className="border border-[#1a1a1a] text-white px-8 py-4 font-bold uppercase tracking-widest text-xs hover:bg-[#111] transition-all"
            >
              Technical Specs
            </a>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="border-b border-[#1a1a1a] bg-[#080808] py-4">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-between gap-8 text-[9px] uppercase tracking-[0.4em] text-[#222]">
          <div className="flex items-center gap-2"><CheckCircle2 size={10} /> 99.9% Uptime</div>
          <div className="flex items-center gap-2"><CheckCircle2 size={10} /> 1.2M Lines Generated</div>
          <div className="flex items-center gap-2"><CheckCircle2 size={10} /> 450ms Average Latency</div>
          <div className="flex items-center gap-2"><CheckCircle2 size={10} /> ISO-27001 Compliant</div>
        </div>
      </div>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 border-b border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="space-y-4">
            <h2 className="text-[#00ff88] text-xs font-bold tracking-[0.4em] uppercase">Core Subsystems</h2>
            <h3 className="text-3xl text-white font-bold tracking-tighter uppercase">Engineered for Velocity</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((feature, i) => (
              <div key={i} className="group border border-[#1a1a1a] p-8 space-y-4 hover:border-[#00ff8833] hover:bg-[#080808] transition-all">
                <div className="w-10 h-10 bg-[#111] border border-[#1a1a1a] flex items-center justify-center text-[#00ff88] group-hover:scale-110 transition-transform">
                  <feature.icon size={20} />
                </div>
                <h4 className="text-white text-sm font-bold uppercase tracking-widest">{feature.title}</h4>
                <p className="text-[11px] text-[#444] leading-relaxed uppercase tracking-wider">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Table */}
      <section id="pricing" className="py-24 px-6 bg-[#080808]">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-[#00ff88] text-xs font-bold tracking-[0.4em] uppercase">Credit Allocation</h2>
            <h3 className="text-3xl text-white font-bold tracking-tighter uppercase">Transparent Tiers</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {PRICING.map((tier, i) => (
              <div key={i} className={`border p-10 space-y-8 flex flex-col ${i === 1 ? 'border-[#00ff8844] bg-[#0a0a0a] scale-105' : 'border-[#1a1a1a]'}`}>
                <div className="space-y-2">
                  <div className="text-xs text-[#444] tracking-[0.3em] uppercase">{tier.name}</div>
                  <div className="text-4xl text-white font-bold tracking-tighter">
                    {tier.price}<span className="text-xs font-normal text-[#444] tracking-widest ml-1">/MO</span>
                  </div>
                </div>
                <div className="bg-[#00ff8811] border border-[#00ff8822] p-4 text-center">
                  <div className="text-[#00ff88] text-lg font-bold tracking-widest">{tier.credits}</div>
                  <div className="text-[8px] text-[#00ff88] uppercase tracking-[0.4em]">Credits Included</div>
                </div>
                <p className="text-[10px] text-[#444] leading-relaxed uppercase tracking-wider h-12">
                  {tier.description}
                </p>
                <div className="space-y-3 flex-1">
                  {tier.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-3 text-[9px] uppercase tracking-widest">
                      <div className="w-1 h-1 bg-[#00ff88]" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setShowAuth(true)}
                  className={`w-full py-4 font-bold uppercase tracking-widest text-[10px] transition-all ${
                    i === 1 ? 'bg-[#00ff88] text-black hover:bg-[#00cc6d]' : 'bg-[#111] text-white border border-[#1a1a1a] hover:border-[#00ff8844]'
                  }`}
                >
                  Select Protocol
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="p-12 border-t border-[#1a1a1a] text-[10px] uppercase tracking-[0.3em] text-[#222]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 bg-[#111] rounded-sm flex items-center justify-center text-[#00ff88] font-bold">N</div>
            <span>NEXUS PRIME CORP // GLOBAL OPERATIONS</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-[#444] transition-colors">Documentation</a>
            <a href="#" className="hover:text-[#444] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#444] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#444] transition-colors">Support</a>
          </div>
          <span>© 2026 NEXUS PRIME</span>
        </div>
      </footer>
    </div>
  );
}

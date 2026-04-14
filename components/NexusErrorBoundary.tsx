"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Terminal as TerminalIcon } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class NexusErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Nexus Error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-mono">
          <div className="max-w-xl w-full border border-[#ff444444] bg-[#0a0a0a] p-8 space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 border-b border-[#ff444422] pb-4">
              <div className="w-10 h-10 bg-[#ff444422] rounded-sm flex items-center justify-center text-[#ff4444]">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h1 className="text-[#ff4444] text-lg font-bold tracking-widest uppercase">System Critical Error</h1>
                <p className="text-[#444] text-[10px] uppercase tracking-[0.2em]">Sequence Terminated Prematurely</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[#888] text-xs leading-relaxed">
                A fatal exception occurred during execution. The current session has been halted to prevent data corruption.
              </div>
              
              <div className="bg-[#111] p-4 border border-[#1a1a1a] rounded-[2px]">
                <div className="flex items-center gap-2 text-[#444] text-[9px] uppercase tracking-widest mb-2">
                  <TerminalIcon size={12} /> Error Stack Trace
                </div>
                <div className="text-[#ff4444] text-[10px] break-all opacity-80 leading-tight">
                  {this.state.error?.message || "Unknown Runtime Error"}
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 bg-[#ff4444] text-black py-4 font-bold uppercase tracking-widest text-[10px] hover:bg-[#ff6666] transition-all active:scale-[0.98]"
            >
              <RefreshCw size={14} />
              Re-Initialize System
            </button>

            <div className="text-[8px] text-[#222] uppercase tracking-[0.4em] text-center">
              Nexus Guard v1.0 | Protection Level: Maximum
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

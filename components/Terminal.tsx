"use client";

import { useEffect, useState, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const supabase = typeof window !== 'undefined' ? createClient() : null;

export default function Terminal({ jobId }: { jobId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [agencyConfig, setAgencyConfig] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAgency = async () => {
      try {
        const res = await fetch('/api/user/agency');
        const data = await res.json();
        if (data.agency_mode) setAgencyConfig(data.agency_config);
      } catch (e) {}
    };
    fetchAgency();
  }, []);

  useEffect(() => {
    if (!supabase || !jobId) return;

    // 1. Fetch existing events
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("agent_events")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });
      if (data) setEvents(data);
    };

    fetchEvents();

    // 2. Subscribe to new events (Realtime)
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_events",
          filter: `job_id=eq.${jobId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.new) {
            setEvents((prev) => [...(prev || []), payload.new]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 font-mono text-sm h-[500px] flex flex-col">
      <div className="flex items-center gap-2 mb-4 border-b border-[#1a1a1a] pb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/50" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
        <div className="w-3 h-3 rounded-full bg-[#00ff88]/50" />
        <span className="text-[#888] ml-2 text-xs">{agencyConfig?.hide_nexus_logs ? (agencyConfig.company_name || 'AI ORCHESTRATOR').toUpperCase() : 'NEXUS PRIME ORCHESTRATOR v1.0.4'}</span>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
        {events && Array.isArray(events) && events.map((event, i) => {
          let content = event?.content || '';
          if (agencyConfig?.hide_nexus_logs) {
            const agencyName = agencyConfig.company_name || 'Agent';
            content = content.replace(/NEXUS PRIME/g, agencyName).replace(/Nexus Prime/g, agencyName);
          }
          return (
            <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-[#00ff88] mr-2">[{((event?.agent_name as string) || 'SYSTEM').split('-')[0].toUpperCase()}]</span>
              <span className="text-[#888] mr-2">({event?.event_type || 'info'}):</span>
              <span className="text-white leading-relaxed">{content}</span>
            </div>
          );
        })}
        {(!events || events.length === 0) && (
          <div className="text-[#444] italic">Waiting for agent initialization...</div>
        )}
      </div>

      <div className="mt-4 pt-2 border-t border-[#1a1a1a] flex items-center gap-2">
        <span className="text-[#00ff88] animate-pulse">●</span>
        <span className="text-[#444] text-xs tracking-widest uppercase">System Online</span>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { createClient, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

const supabase = (typeof window !== 'undefined' || process.env.NEXT_PUBLIC_SUPABASE_URL) ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
) : null as any;

export default function Terminal({ jobId }: { jobId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
          setEvents((prev) => [...prev, payload.new]);
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
        <span className="text-[#888] ml-2 text-xs">NEXUS PRIME ORCHESTRATOR v1.0.4</span>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
        {events.map((event, i) => (
          <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">
            <span className="text-[#00ff88] mr-2">[{(event.agent_name || 'SYSTEM').split('-')[0].toUpperCase()}]</span>
            <span className="text-[#888] mr-2">({event.event_type}):</span>
            <span className="text-white leading-relaxed">{event.content}</span>
          </div>
        ))}
        {events.length === 0 && (
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

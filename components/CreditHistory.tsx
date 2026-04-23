"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = typeof window !== 'undefined' ? createClient() : (null as any);

export default function CreditHistory({ userId }: { userId: string }) {
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLedger = async () => {
      const { data, error } = await supabase
        .from("user_credit_ledger")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (data) setLedger(data);
      setLoading(false);
    };

    fetchLedger();
  }, [userId]);

  if (loading) return <div className="text-[#444] animate-pulse">Scanning ledger...</div>;

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6 font-mono text-xs overflow-hidden flex flex-col h-[400px]">
      <div className="text-[#444] uppercase tracking-widest mb-4 flex justify-between">
        <span>Transaction Ledger</span>
        <span>Balance History</span>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
        {ledger.length === 0 ? (
          <div className="text-[#333] italic">No transactions found in this sequence.</div>
        ) : (
          ledger.map((entry, i) => (
            <div key={i} className="flex justify-between items-start border-b border-[#111] pb-2 group hover:bg-[#111] transition-colors">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold ${
                    entry.type === 'PURCHASE' ? 'bg-[#00ff8822] text-[#00ff88]' : 'bg-[#ff444422] text-[#ff4444]'
                  }`}>
                    {entry.type}
                  </span>
                  <span className="text-white uppercase tracking-tighter">{entry.description}</span>
                </div>
                <span className="text-[#444] text-[9px]">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
              <div className={`font-bold ${entry.amount > 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
                {entry.amount > 0 ? `+${entry.amount}` : entry.amount} CR
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-2 border-t border-[#1a1a1a] text-[#444] text-[9px] uppercase tracking-widest flex justify-between">
        <span>End of Sequence</span>
        <span>NEXUS PRIME LEDGER v1.0</span>
      </div>
    </div>
  );
}

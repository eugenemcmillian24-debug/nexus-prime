"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LandingPage from "@/components/LandingPage";
import { createClient } from "@supabase/supabase-js";

const supabase = (typeof window !== 'undefined' || process.env.NEXT_PUBLIC_SUPABASE_URL) ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
) : null as any;

export default function Page() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } }: any = await supabase.auth.getSession();
      if (session?.user) {
        router.replace("/dashboard");
      } else {
        setAuthLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } }: any = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        router.replace("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (authLoading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-12 h-12 border border-dashed border-[#00ff88] rounded-full animate-spin" />
    </div>
  );

  return <LandingPage />;
}

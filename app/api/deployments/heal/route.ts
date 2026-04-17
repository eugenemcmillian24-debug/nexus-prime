import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { NexusOrchestrator } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { deploymentId } = await req.json();
    if (!deploymentId) return NextResponse.json({ error: "Missing deploymentId" }, { status: 400 });

    const orchestrator = new NexusOrchestrator({
      groqKey: process.env.GROQ_API_KEY!,
      openRouterKey: process.env.OPENROUTER_API_KEY!,
      googleAIKey: process.env.GOOGLE_AI_KEY!,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const result = await orchestrator.healDeployment(deploymentId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Heal API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

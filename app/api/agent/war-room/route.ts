import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { NexusOrchestrator } from "@/lib/ai";
import { errorResponse } from "@/lib/apiError";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt, jobId } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

    let activeJobId = jobId;
    if (!activeJobId) {
      // Create a new placeholder job for the War Room session
      const { data: job, error: jobError } = await supabase
        .from('agent_jobs')
        .insert({
          user_id: user.id,
          prompt: prompt,
          status: 'running',
        })
        .select()
        .single();

      if (jobError) throw jobError;
      activeJobId = job.id;
    }

    const orchestrator = new NexusOrchestrator({
      groqKey: process.env.GROQ_API_KEY!,
      openRouterKey: process.env.OPENROUTER_API_KEY!,
      googleAIKey: process.env.GOOGLE_AI_KEY!,
      supabaseUrl: (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    // Conduct the multi-agent debate
    const debate = await orchestrator.conductWarRoomDebate(activeJobId, prompt);

    // Update job status
    await supabase.from('agent_jobs').update({
      status: 'completed',
      result: { debate }
    }).eq('id', activeJobId);

    return NextResponse.json({ jobId: activeJobId, debate });
  } catch (error: any) {
    return errorResponse(error, "War Room API Error:");
  }
}

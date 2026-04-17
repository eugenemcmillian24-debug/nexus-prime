import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { NexusOrchestrator } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileContent, voiceCommand, projectId } = await req.json();
    if (!fileContent || !voiceCommand) {
      return NextResponse.json({ error: "File content and voice command are required." }, { status: 400 });
    }

    // Create a new job record for logging this voice edit event
    const { data: job, error: jobError } = await supabase
      .from('agent_jobs')
      .insert({
        user_id: user.id,
        project_id: projectId || null,
        prompt: `Voice Edit: "${voiceCommand}"`,
        status: 'running',
      })
      .select()
      .single();

    if (jobError) throw jobError;

    const orchestrator = new NexusOrchestrator({
      groqKey: process.env.GROQ_API_KEY!,
      openRouterKey: process.env.OPENROUTER_API_KEY!,
      googleAIKey: process.env.GOOGLE_AI_KEY!,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const updatedCode = await orchestrator.applyVoiceEdit(job.id, fileContent, voiceCommand);

    // Update job status
    await supabase.from('agent_jobs').update({
      status: 'completed',
      result: { updatedCode }
    }).eq('id', job.id);

    return NextResponse.json({ jobId: job.id, updatedCode });
  } catch (error: any) {
    console.error("Voice Edit API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

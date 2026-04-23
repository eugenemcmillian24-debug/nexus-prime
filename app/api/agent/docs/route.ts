import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { NexusOrchestrator } from "@/lib/ai";
import { errorResponse } from "@/lib/apiError";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId } = await req.json();
    if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

    // Create a new job record for this task
    const { data: job, error: jobError } = await supabase
      .from('agent_jobs')
      .insert({
        user_id: user.id,
        project_id: projectId,
        prompt: "Generate Project Documentation & Component Lab",
        status: 'running',
      })
      .select()
      .single();

    if (jobError) throw jobError;

    const orchestrator = new NexusOrchestrator({
      groqKey: process.env.GROQ_API_KEY!,
      openRouterKey: process.env.OPENROUTER_API_KEY!,
      googleAIKey: process.env.GOOGLE_AI_KEY!,
      supabaseUrl: (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const result = await orchestrator.generateDocumentation(job.id, projectId);

    // Sync generated files to Supabase
    if (result.files) {
      for (const file of result.files) {
        const ext = file.path.split(".").pop()?.toLowerCase();
        const langMap: Record<string, string> = {
          ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
          css: "css", scss: "scss", html: "html", json: "json", md: "markdown", sql: "sql",
        };
        const language = langMap[ext || ""] || "plaintext";

        await supabase.from('project_files').upsert({
          project_id: projectId,
          path: file.path,
          content: file.content,
          language,
          size_bytes: Buffer.from(file.content || "").length,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'project_id,path' });
      }
    }

    // Update job status
    await supabase.from('agent_jobs').update({
      status: 'completed',
      result: { ...result }
    }).eq('id', job.id);

    return NextResponse.json({ jobId: job.id, ...result });
  } catch (error: any) {
    return errorResponse(error, "Documentation API Error:");
  }
}

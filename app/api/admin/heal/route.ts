import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';
import { NexusOrchestrator } from '@/lib/ai';
import { isNexusPrimeAdmin } from '@/lib/nexus_prime_access';

export async function POST(req: Request) {
  try {
    const isAdmin = await isNexusPrimeAdmin();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { deploymentId } = await req.json();
    if (!deploymentId) return NextResponse.json({ error: "Missing deploymentId" }, { status: 400 });

    const orchestrator = new NexusOrchestrator({
      groqKey: process.env.GROQ_API_KEY!,
      openRouterKey: process.env.OPENROUTER_API_KEY!,
      googleAIKey: process.env.GOOGLE_AI_KEY!,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    // 1. Run AI Healing Diagnosis & Fix Generation
    console.log(`[Admin] Triggering Auto-Heal for deployment: ${deploymentId}`);
    const healResult = await orchestrator.healDeployment(deploymentId);

    if (!healResult || !healResult.files) {
      throw new Error("AI failed to generate a fix for this build error.");
    }

    // 2. Apply fixes to the project_files table
    const supabase = createClient();
    const { data: deploy } = await supabase
      .from('deployments')
      .select('project_id')
      .eq('id', deploymentId)
      .single();

    if (deploy?.project_id) {
      for (const file of healResult.files) {
        const ext = file.path.split(".").pop()?.toLowerCase();
        const langMap: Record<string, string> = {
          ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
          css: "css", scss: "scss", html: "html", json: "json", md: "markdown", sql: "sql",
        };
        const language = langMap[ext || ""] || "plaintext";

        await supabase.from('project_files').upsert({
          project_id: deploy.project_id,
          path: file.path,
          content: file.content,
          language,
          size_bytes: Buffer.from(file.content || "").length,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'project_id,path' });
      }
    }

    return NextResponse.json({ 
      success: true, 
      analysis: healResult.analysis,
      filesFixed: healResult.files.map((f: any) => f.path)
    });
  } catch (error: any) {
    console.error('[Heal API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

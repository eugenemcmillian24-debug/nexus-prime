import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { NexusOrchestrator } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { figmaUrl, accessToken, projectId } = await req.json();
    if (!figmaUrl || !accessToken) {
      return NextResponse.json({ error: "Figma URL and Access Token are required." }, { status: 400 });
    }

    // Extract File Key and Node ID from URL
    // Format: https://www.figma.com/file/FILE_KEY/TITLE?node-id=NODE_ID
    const fileKeyMatch = figmaUrl.match(/\/file\/([a-zA-Z0-9]+)\//);
    const nodeIdMatch = figmaUrl.match(/node-id=([0-9:-]+)/);

    if (!fileKeyMatch) {
      return NextResponse.json({ error: "Invalid Figma URL format." }, { status: 400 });
    }

    const fileKey = fileKeyMatch[1];
    const nodeId = nodeIdMatch ? nodeIdMatch[1].replace('-', ':') : null;

    // Fetch node data from Figma API
    const figmaApiUrl = nodeId 
      ? `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`
      : `https://api.figma.com/v1/files/${fileKey}`;

    const figmaRes = await fetch(figmaApiUrl, {
      headers: { "X-Figma-Token": accessToken }
    });

    if (!figmaRes.ok) {
      const error = await figmaRes.json();
      return NextResponse.json({ error: `Figma API Error: ${error.message || figmaRes.statusText}` }, { status: figmaRes.status });
    }

    const figmaData = await figmaRes.json();
    
    // Process the node(s) with AI
    const orchestrator = new NexusOrchestrator({
      groqKey: process.env.GROQ_API_KEY!,
      openRouterKey: process.env.OPENROUTER_API_KEY!,
      googleAIKey: process.env.GOOGLE_AI_KEY!,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const conversionResult = await orchestrator.importFromFigma(
      nodeId ? { nodes: Object.values(figmaData.nodes).map((n: any) => n.document) } : { node: figmaData.document }
    );

    // Sync generated files to Supabase if projectId provided
    if (projectId && conversionResult.files) {
      for (const file of conversionResult.files) {
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

    return NextResponse.json(conversionResult);
  } catch (error: any) {
    console.error("Figma Import API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

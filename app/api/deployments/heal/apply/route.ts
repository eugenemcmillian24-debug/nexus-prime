import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId, files } = await req.json();
    if (!projectId || !files || !Array.isArray(files)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // 1. Apply the fixes to project_files
    for (const file of files) {
      const ext = file.path.split(".").pop()?.toLowerCase();
      const langMap: Record<string, string> = {
        ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
        css: "css", scss: "scss", html: "html", json: "json", md: "markdown", sql: "sql",
      };
      const language = langMap[ext || ""] || "plaintext";

      const { error } = await supabase.from('project_files').upsert({
        project_id: projectId,
        path: file.path,
        content: file.content,
        language,
        size_bytes: Buffer.from(file.content || "").length,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_id,path' });

      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: "Fixes applied successfully. Ready for re-deployment." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Heal Apply API Error:", error);
    return NextResponse.json({ error: message || "Internal Server Error" }, { status: 500 });
  }
}

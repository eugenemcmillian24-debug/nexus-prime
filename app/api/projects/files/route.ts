import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";

// GET /api/projects/files?project_id=xxx - List files in a project
export async function GET(req: NextRequest) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "Missing project_id" }, { status: 400 });

  // Verify ownership or public access
  const { data: project } = await supabase
    .from("projects")
    .select("user_id, is_public")
    .eq("id", projectId)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (project.user_id !== userId && !project.is_public) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("project_files")
    .select("*")
    .eq("project_id", projectId)
    .order("path");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ files: data });
  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/projects/files - Create or update a file
export async function POST(req: NextRequest) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const body = await req.json();
  const { project_id, path, content, language, is_entry_point } = body;

  if (!project_id || !path) {
    return NextResponse.json({ error: "Missing project_id or path" }, { status: 400 });
  }

  // Verify ownership
  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", project_id)
    .single();

  if (!project || project.user_id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("project_files")
    .upsert(
      {
        project_id,
        path,
        content: content || "",
        language: language || detectLanguage(path),
        is_entry_point: is_entry_point || false,
        size_bytes: new TextEncoder().encode(content || "").length,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,path" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update project timestamp
  await supabase
    .from("projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", project_id);

  return NextResponse.json({ file: data });
  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/projects/files - Delete a file
export async function DELETE(req: NextRequest) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  const path = searchParams.get("path");

  if (!projectId || !path) {
    return NextResponse.json({ error: "Missing project_id or path" }, { status: 400 });
  }

  // Verify ownership
  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .single();

  if (!project || project.user_id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { error } = await supabase
    .from("project_files")
    .delete()
    .eq("project_id", projectId)
    .eq("path", path);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    css: "css", scss: "scss", html: "html", json: "json", md: "markdown", sql: "sql",
  };
  return map[ext || ""] || "plaintext";
}

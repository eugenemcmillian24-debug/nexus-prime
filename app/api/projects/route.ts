import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/projects - List user's projects
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("projects")
    .select("*, project_files(count)", { count: "exact" })
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    projects: data,
    total: count,
    page,
    limit,
  });
}

// POST /api/projects - Create a new project
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description, files, forked_from } = body;

  // Create the project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: name || "Untitled Project",
      description: description || null,
      forked_from: forked_from || null,
    })
    .select()
    .single();

  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });

  // Create initial files if provided
  if (files && files.length > 0) {
    const fileRecords = files.map((f: any) => ({
      project_id: project.id,
      path: f.path,
      content: f.content || "",
      language: f.language || detectLanguage(f.path),
      is_entry_point: f.is_entry_point || false,
      size_bytes: new TextEncoder().encode(f.content || "").length,
    }));

    await supabase.from("project_files").insert(fileRecords);
  }

  // Create initial version
  const snapshot = (files || []).map((f: any) => ({
    path: f.path,
    content: f.content || "",
    language: f.language || detectLanguage(f.path),
    is_entry_point: f.is_entry_point || false,
  }));

  await supabase.from("project_versions").insert({
    project_id: project.id,
    version_number: 1,
    message: "Initial version",
    snapshot,
    created_by: userId,
  });

  return NextResponse.json({ project }, { status: 201 });
}

// PATCH /api/projects - Update a project
export async function PATCH(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, name, description, is_public } = body;

  if (!id) return NextResponse.json({ error: "Missing project id" }, { status: 400 });

  const { data, error } = await supabase
    .from("projects")
    .update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(is_public !== undefined && { is_public }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ project: data });
}

// DELETE /api/projects - Delete a project
export async function DELETE(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing project id" }, { status: 400 });

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    css: "css", scss: "scss", html: "html", json: "json", md: "markdown", sql: "sql",
  };
  return map[ext || ""] || "plaintext";
}

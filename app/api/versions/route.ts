import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";

// GET /api/versions?project_id=xxx - List versions for a project
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  const versionNumber = searchParams.get("version");

  if (!projectId) return NextResponse.json({ error: "Missing project_id" }, { status: 400 });

  // Verify access
  const { data: project } = await supabase
    .from("projects")
    .select("user_id, is_public")
    .eq("id", projectId)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (project.user_id !== userId && !project.is_public) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (versionNumber) {
    // Get specific version
    const { data, error } = await supabase
      .from("project_versions")
      .select("*")
      .eq("project_id", projectId)
      .eq("version_number", parseInt(versionNumber))
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ version: data });
  }

  // List all versions
  const { data, error } = await supabase
    .from("project_versions")
    .select("id, version_number, message, snapshot, diff_summary, created_at")
    .eq("project_id", projectId)
    .order("version_number", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ versions: data });
}

// POST /api/versions - Create a new version (snapshot current files)
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const body = await req.json();
  const { project_id, message } = body;

  if (!project_id) return NextResponse.json({ error: "Missing project_id" }, { status: 400 });

  // Verify ownership
  const { data: project } = await supabase
    .from("projects")
    .select("user_id, current_version")
    .eq("id", project_id)
    .single();

  if (!project || project.user_id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Get current files for snapshot
  const { data: files } = await supabase
    .from("project_files")
    .select("path, content, language, is_entry_point")
    .eq("project_id", project_id)
    .order("path");

  const snapshot = files || [];
  const nextVersion = (project.current_version || 0) + 1;

  // Get previous version for diff
  const { data: prevVersion } = await supabase
    .from("project_versions")
    .select("id, snapshot")
    .eq("project_id", project_id)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  // Compute diff summary
  let diffSummary = null;
  if (prevVersion) {
    const oldFiles = prevVersion.snapshot || [];
    const oldMap = new Map(oldFiles.map((f: any) => [f.path, f.content]));
    const newMap = new Map(snapshot.map((f: any) => [f.path, f.content]));

    const added = snapshot.filter((f: any) => !oldMap.has(f.path)).map((f: any) => f.path);
    const deleted = oldFiles.filter((f: any) => !newMap.has(f.path)).map((f: any) => f.path);
    const modified = snapshot
      .filter((f: any) => oldMap.has(f.path) && oldMap.get(f.path) !== f.content)
      .map((f: any) => f.path);

    diffSummary = { added, modified, deleted };
  }

  // Insert version
  const { data: version, error } = await supabase
    .from("project_versions")
    .insert({
      project_id,
      version_number: nextVersion,
      message: message || "Auto-save",
      snapshot,
      parent_version_id: prevVersion?.id || null,
      diff_summary: diffSummary,
      created_by: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update project version
  await supabase
    .from("projects")
    .update({ current_version: nextVersion, updated_at: new Date().toISOString() })
    .eq("id", project_id);

  return NextResponse.json({ version }, { status: 201 });
}

// PUT /api/versions - Rollback to a specific version
export async function PUT(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const body = await req.json();
  const { project_id, version_number } = body;

  if (!project_id || !version_number) {
    return NextResponse.json({ error: "Missing project_id or version_number" }, { status: 400 });
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

  // Get the target version snapshot
  const { data: version } = await supabase
    .from("project_versions")
    .select("snapshot")
    .eq("project_id", project_id)
    .eq("version_number", version_number)
    .single();

  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  // Delete current files
  await supabase.from("project_files").delete().eq("project_id", project_id);

  // Restore files from snapshot
  const restoredFiles = (version.snapshot || []).map((f: any) => ({
    project_id,
    path: f.path,
    content: f.content || "",
    language: f.language || "plaintext",
    is_entry_point: f.is_entry_point || false,
    size_bytes: new TextEncoder().encode(f.content || "").length,
  }));

  if (restoredFiles.length > 0) {
    await supabase.from("project_files").insert(restoredFiles);
  }

  // Create a rollback version entry
  const { data: latest } = await supabase
    .from("project_versions")
    .select("version_number")
    .eq("project_id", project_id)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  const nextVer = (latest?.version_number || 0) + 1;

  await supabase.from("project_versions").insert({
    project_id,
    version_number: nextVer,
    message: `Rolled back to v${version_number}`,
    snapshot: version.snapshot,
    created_by: userId,
    diff_summary: { added: [], modified: ["rollback"], deleted: [] },
  });

  await supabase
    .from("projects")
    .update({ current_version: nextVer, updated_at: new Date().toISOString() })
    .eq("id", project_id);

  return NextResponse.json({
    success: true,
    message: `Rolled back to version ${version_number}`,
    new_version: nextVer,
  });
}

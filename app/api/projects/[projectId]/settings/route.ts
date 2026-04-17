import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.projectId)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Mock settings since they might not all be in the DB yet
  return NextResponse.json({
    id: project.id,
    name: project.name,
    description: project.description,
    slug: project.name.toLowerCase().replace(/ /g, "-"),
    isPublic: project.is_public,
    teamId: null,
    defaultModel: "groq",
    autoSave: true,
    autoFormat: true,
    tabSize: 2,
    theme: "dark",
    lintOnSave: true,
    deployTarget: "vercel",
    customDomain: "",
    envVars: [],
    webhookUrl: "",
    webhookEvents: [],
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description, isPublic } = body;

  const { data: project, error } = await supabase
    .from("projects")
    .update({
      name,
      description,
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.projectId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(project);
}

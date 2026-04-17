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

  // Map DB columns to camelCase for the frontend
  return NextResponse.json({
    id: project.id,
    name: project.name,
    description: project.description,
    slug: project.slug || project.name.toLowerCase().replace(/ /g, "-"),
    isPublic: project.is_public,
    teamId: project.team_id || null,
    defaultModel: project.default_model || "groq",
    autoSave: project.auto_save ?? true,
    autoFormat: project.auto_format ?? true,
    tabSize: project.tab_size || 2,
    theme: project.theme || "dark",
    lintOnSave: project.lint_on_save ?? true,
    deployTarget: project.deploy_target || "vercel",
    customDomain: project.custom_domain || "",
    envVars: project.env_vars || [],
    webhookUrl: project.webhook_url || "",
    webhookEvents: project.webhook_events || [],
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
  const { 
    name, 
    description, 
    isPublic, 
    slug, 
    defaultModel, 
    autoSave, 
    autoFormat, 
    tabSize, 
    theme, 
    lintOnSave, 
    deployTarget, 
    customDomain, 
    envVars, 
    webhookUrl, 
    webhookEvents 
  } = body;

  const { data: project, error } = await supabase
    .from("projects")
    .update({
      name,
      description,
      is_public: isPublic,
      slug,
      default_model: defaultModel,
      auto_save: autoSave,
      auto_format: autoFormat,
      tab_size: tabSize,
      theme,
      lint_on_save: lintOnSave,
      deploy_target: deployTarget,
      custom_domain: customDomain,
      env_vars: envVars,
      webhook_url: webhookUrl,
      webhook_events: webhookEvents,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.projectId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(project);
}

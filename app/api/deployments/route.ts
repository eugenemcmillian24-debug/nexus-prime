import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

// POST /api/deployments - Trigger a new deployment
export async function POST(req: NextRequest) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, environment, versionNumber } = await req.json();
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  // Check for active deployments
  const { data: active } = await supabase
    .from("deployments")
    .select("id")
    .eq("project_id", projectId)
    .in("status", ["queued", "building", "deploying"])
    .limit(1);

  if (active && active.length > 0) {
    return NextResponse.json({ error: "A deployment is already in progress" }, { status: 409 });
  }

  // Get project files for deployment
  const { data: files } = await supabase
    .from("project_files")
    .select("path, content, language")
    .eq("project_id", projectId);

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files to deploy" }, { status: 400 });
  }

  // Create deployment record
  const { data: deployment, error } = await supabase
    .from("deployments")
    .insert({
      project_id: projectId,
      version_number: versionNumber || null,
      platform: "vercel",
      status: "queued",
      environment: environment || "preview",
      triggered_by: user.id,
      metadata: { file_count: files.length },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Trigger async deployment (in production, this would call Vercel API)
  // For now, simulate the deployment pipeline
  triggerVercelDeploy(supabase, deployment.id, projectId, files, environment || "preview").catch(
    (err) => console.error("Deploy error:", err)
  );

  return NextResponse.json({
    id: deployment.id,
    projectId: deployment.project_id,
    versionNumber: deployment.version_number,
    platform: deployment.platform,
    status: deployment.status,
    environment: deployment.environment,
    createdAt: deployment.created_at,
  });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error('POST error:', error);
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 });
  }
}

// Async deployment handler
async function triggerVercelDeploy(
  supabase: SupabaseClient,
  deployId: string,
  projectId: string,
  files: Array<{ path: string; content: string; language: string }>,
  environment: string
) {
  try {
    // Update to building
    await supabase
      .from("deployments")
      .update({ status: "building", started_at: new Date().toISOString() })
      .eq("id", deployId);

    // Build: Call Vercel API to create deployment
    const vercelToken = process.env.VERCEL_TOKEN;
    if (!vercelToken) throw new Error("VERCEL_TOKEN not configured");

    const vercelFiles = files.map((f) => ({
      file: f.path,
      data: Buffer.from(f.content || "").toString("base64"),
      encoding: "base64",
    }));

    // Update to deploying
    await supabase.from("deployments").update({ status: "deploying" }).eq("id", deployId);

    const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `nexus-${projectId.slice(0, 8)}`,
        files: vercelFiles,
        target: environment === "production" ? "production" : undefined,
        projectSettings: { framework: null },
      }),
    });

    if (!deployRes.ok) {
      const err = await deployRes.text();
      throw new Error(`Vercel API error: ${err}`);
    }

    const deployData = await deployRes.json();

    await supabase
      .from("deployments")
      .update({
        status: "ready",
        deploy_url: `https://${deployData.url}`,
        preview_url: `https://${deployData.url}`,
        commit_sha: deployData.id,
        completed_at: new Date().toISOString(),
        build_log: `Deployment successful\nURL: https://${deployData.url}\nFiles: ${files.length}`,
      })
      .eq("id", deployId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await supabase
      .from("deployments")
      .update({
        status: "failed",
        error_message: message,
        build_log: `Deployment failed: ${message}`,
        completed_at: new Date().toISOString(),
      })
      .eq("id", deployId);
  }
}

// GET /api/deployments?projectId=...
export async function GET(req: NextRequest) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const { data, error } = await supabase
    .from("deployments")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    data.map((d) => ({
      id: d.id,
      projectId: d.project_id,
      versionNumber: d.version_number,
      platform: d.platform,
      status: d.status,
      deployUrl: d.deploy_url,
      previewUrl: d.preview_url,
      buildLog: d.build_log,
      errorMessage: d.error_message,
      environment: d.environment,
      commitSha: d.commit_sha,
      metadata: d.metadata,
      triggeredBy: d.triggered_by,
      createdAt: d.created_at,
      startedAt: d.started_at,
      completedAt: d.completed_at,
    }))
  );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error('GET error:', error);
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 });
  }
}

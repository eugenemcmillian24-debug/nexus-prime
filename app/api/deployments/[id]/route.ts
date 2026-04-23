import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/apiError";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("deployments")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) return errorResponse(error, '/api/deployments/[id]');

  return NextResponse.json({
    id: data.id,
    projectId: data.project_id,
    versionNumber: data.version_number,
    platform: data.platform,
    status: data.status,
    deployUrl: data.deploy_url,
    previewUrl: data.preview_url,
    buildLog: data.build_log,
    errorMessage: data.error_message,
    environment: data.environment,
    commitSha: data.commit_sha,
    metadata: data.metadata,
    triggeredBy: data.triggered_by,
    createdAt: data.created_at,
    startedAt: data.started_at,
    completedAt: data.completed_at,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();

  const { data, error } = await supabase
    .from("deployments")
    .update({ status })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return errorResponse(error, '/api/deployments/[id]');

  return NextResponse.json({
    id: data.id,
    projectId: data.project_id,
    versionNumber: data.version_number,
    platform: data.platform,
    status: data.status,
    deployUrl: data.deploy_url,
    previewUrl: data.preview_url,
    buildLog: data.build_log,
    errorMessage: data.error_message,
    environment: data.environment,
    commitSha: data.commit_sha,
    metadata: data.metadata,
    triggeredBy: data.triggered_by,
    createdAt: data.created_at,
    startedAt: data.started_at,
    completedAt: data.completed_at,
  });
}

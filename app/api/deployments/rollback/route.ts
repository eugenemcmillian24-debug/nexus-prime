import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/apiError";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, deploymentId } = await req.json();

  // Get the deployment to rollback to
  const { data: deployment, error: fetchError } = await supabase
    .from("deployments")
    .select("*")
    .eq("id", deploymentId)
    .eq("project_id", projectId)
    .single();

  if (fetchError || !deployment) {
    return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
  }

  // A real rollback might involve calling the hosting platform's API (e.g. Vercel)
  // or redeploying the code associated with that deployment.
  // For now, we'll just create a new deployment record pointing to the same version.

  const { data: newDeployment, error } = await supabase
    .from("deployments")
    .insert({
      project_id: projectId,
      version_number: deployment.version_number,
      platform: deployment.platform,
      status: "queued",
      environment: "production",
      triggered_by: user.id,
      metadata: { ...deployment.metadata, rolled_back_from: deploymentId },
    })
    .select()
    .single();

  if (error) return errorResponse(error, '/api/deployments/rollback');

  // Simulate deployment...
  
  return NextResponse.json(newDeployment);
}

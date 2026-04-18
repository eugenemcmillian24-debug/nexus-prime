import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; domainId: string } }
) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, domainId } = params;

  // Verify ownership via project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("custom_domains")
    .select("*")
    .eq("id", domainId)
    .eq("project_id", projectId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Domain not found" }, { status: 404 });

  return NextResponse.json({
    id: data.id,
    domain: data.domain,
    status: data.status,
    verificationToken: data.verification_token,
    isVerified: data.is_verified,
    createdAt: data.created_at,
    verifiedAt: data.verified_at,
  });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error('GET error:', error);
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; domainId: string } }
) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, domainId } = params;

  // Verify ownership via project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
  }

  const { error } = await supabase
    .from("custom_domains")
    .delete()
    .eq("id", domainId)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error('DELETE error:', error);
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 });
  }
}

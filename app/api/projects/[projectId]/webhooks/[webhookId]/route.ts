import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; webhookId: string } }
) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, webhookId } = params;

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
    .from("webhooks")
    .select("*")
    .eq("id", webhookId)
    .eq("project_id", projectId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

  return NextResponse.json({
    id: data.id,
    url: data.url,
    secret: data.secret,
    events: data.events,
    isActive: data.is_active,
    lastTriggered: data.last_triggered_at,
    lastStatus: data.last_status,
    deliveryCount: data.delivery_count,
    failureCount: data.failure_count,
    createdAt: data.created_at,
  });
  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; webhookId: string } }
) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, webhookId } = params;
  const { isActive } = await req.json();

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
    .from("webhooks")
    .update({ is_active: isActive })
    .eq("id", webhookId)
    .eq("project_id", projectId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: data.id,
    url: data.url,
    secret: data.secret,
    events: data.events,
    isActive: data.is_active,
    lastTriggered: data.last_triggered_at,
    lastStatus: data.last_status,
    deliveryCount: data.delivery_count,
    failureCount: data.failure_count,
    createdAt: data.created_at,
  });
  } catch (error: any) {
    console.error('PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; webhookId: string } }
) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, webhookId } = params;

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
    .from("webhooks")
    .delete()
    .eq("id", webhookId)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

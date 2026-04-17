import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = params;

  // Verify ownership
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
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data.map(w => ({
    id: w.id,
    url: w.url,
    secret: w.secret,
    events: w.events,
    isActive: w.is_active,
    lastTriggered: w.last_triggered_at,
    lastStatus: w.last_status,
    deliveryCount: w.delivery_count,
    failureCount: w.failure_count,
    createdAt: w.created_at,
  })));
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = params;
  const { url, events } = await req.json();

  if (!url || !events) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify ownership
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
    .insert({
      project_id: projectId,
      url,
      events,
    })
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
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { errorResponse } from "@/lib/apiError";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { error } = await supabase
    .from("prompt_history")
    .update({ starred: body.starred, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return errorResponse(error, '/api/prompt-history/[id]');
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { error } = await supabase
    .from("prompt_history")
    .update(body)
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return errorResponse(error, '/api/prompt-history/[id]');
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("prompt_history")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return errorResponse(error, '/api/prompt-history/[id]');
  return NextResponse.json({ success: true });
}

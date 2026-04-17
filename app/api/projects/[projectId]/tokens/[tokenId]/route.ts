import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; tokenId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, tokenId } = params;

  const { data, error } = await supabase
    .from("api_tokens")
    .select("*")
    .eq("id", tokenId)
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Token not found" }, { status: 404 });

  return NextResponse.json({
    id: data.id,
    name: data.name,
    tokenPreview: data.token_preview,
    scopes: data.scopes,
    lastUsed: data.last_used_at,
    expiresAt: data.expires_at,
    requestCount: data.request_count,
    createdAt: data.created_at,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; tokenId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, tokenId } = params;

  // Verify ownership via project or token itself
  const { data, error } = await supabase
    .from("api_tokens")
    .delete()
    .eq("id", tokenId)
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

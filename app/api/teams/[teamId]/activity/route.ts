import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("activity_feed")
    .select("*")
    .eq("team_id", params.teamId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with user data
  const userIds = Array.from(new Set(data.map((item) => item.user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  return NextResponse.json(data.map(item => ({
    id: item.id,
    action: item.action,
    metadata: item.metadata,
    createdAt: item.created_at,
    userId: item.user_id,
    projectId: item.project_id,
    user: profileMap.get(item.user_id) ? {
      displayName: profileMap.get(item.user_id)!.display_name,
      email: profileMap.get(item.user_id)!.email,
      avatarUrl: profileMap.get(item.user_id)!.avatar_url,
    } : null,
  })));
}

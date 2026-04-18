import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";

// GET /api/teams/[teamId]/members
export async function GET(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: members, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", params.teamId)
    .order("role", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with profile data
  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  return NextResponse.json(
    members.map((m) => ({
      id: m.id,
      teamId: m.team_id,
      userId: m.user_id,
      role: m.role,
      invitedBy: m.invited_by,
      acceptedAt: m.accepted_at,
      profile: profileMap.get(m.user_id)
        ? {
            email: profileMap.get(m.user_id)!.email,
            displayName: profileMap.get(m.user_id)!.display_name,
            avatarUrl: profileMap.get(m.user_id)!.avatar_url,
          }
        : null,
    }))
  );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error('GET error:', error);
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/teams/[teamId]/members - Add member directly
export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = await req.json();

  const { data, error } = await supabase
    .from("team_members")
    .insert({
      team_id: params.teamId,
      user_id: userId,
      role: role || "viewer",
      invited_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error('POST error:', error);
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 });
  }
}

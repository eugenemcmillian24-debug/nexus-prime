import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";

// POST /api/teams/[teamId]/invites - Send an invite
export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, role } = await req.json();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  // Check for existing invite
  const { data: existing } = await supabase
    .from("team_invites")
    .select("id")
    .eq("team_id", params.teamId)
    .eq("email", email)
    .is("accepted_at", null)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "Invite already sent" }, { status: 409 });
  }

  const { data: invite, error } = await supabase
    .from("team_invites")
    .insert({
      team_id: params.teamId,
      email,
      role: role || "viewer",
      invited_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log activity
  await supabase.from("activity_feed").insert({
    team_id: params.teamId,
    user_id: user.id,
    action: "member.invited",
    metadata: { email, role: role || "viewer" },
  });

  // In production, send email with invite link containing invite.token
  return NextResponse.json(invite);
}

// GET /api/teams/[teamId]/invites
export async function GET(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("team_invites")
    .select("*")
    .eq("team_id", params.teamId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

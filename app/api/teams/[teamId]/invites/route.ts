import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { TIER_LIMITS } from "@/lib/nexus_prime_access";

// POST /api/teams/[teamId]/invites - Send an invite
export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. CHECK SEAT LIMIT
  // Get owner's tier
  const { data: team } = await supabase
    .from("teams")
    .select("owner_id")
    .eq("id", params.teamId)
    .single();
    
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const { data: ownerCredits } = await supabase
      .from("user_credits")
      .select("tier, seat_limit_override")
      .eq("user_id", team.owner_id)
      .single();

    const tier = ownerCredits?.tier || 'Free';
    const seatLimit = ownerCredits?.seat_limit_override || (TIER_LIMITS as any)[tier]?.seats || 1;

    const { count: memberCount } = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("team_id", params.teamId);

    const { count: pendingInviteCount } = await supabase
      .from("team_invites")
      .select("*", { count: "exact", head: true })
      .eq("team_id", params.teamId)
      .is("accepted_at", null);

    if ((memberCount || 0) + (pendingInviteCount || 0) >= seatLimit) {
      return NextResponse.json(
        { error: `Seat limit reached for your ${tier} plan. Please upgrade to add more members.` },
        { status: 403 }
      );
    }


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

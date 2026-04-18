import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";

// POST /api/teams - Create a new team
export async function POST(req: NextRequest) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, slug } = await req.json();
  if (!name || !slug) return NextResponse.json({ error: "Missing name or slug" }, { status: 400 });

  // Create team
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({ name, slug, owner_id: user.id })
    .select()
    .single();

  if (teamError) {
    if (teamError.code === "23505") {
      return NextResponse.json({ error: "Team slug already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: teamError.message }, { status: 500 });
  }

  // Add creator as owner member
  await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: user.id,
    role: "owner",
    accepted_at: new Date().toISOString(),
  });

  // Log activity
  await supabase.from("activity_feed").insert({
    team_id: team.id,
    user_id: user.id,
    action: "team.created",
    metadata: { team_name: name },
  });

  return NextResponse.json(team);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error('POST error:', error);
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 });
  }
}

// GET /api/teams - List user's teams
export async function GET() {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    return NextResponse.json([]);
  }

  const teamIds = memberships.map((m) => m.team_id);
  const { data: teams, error } = await supabase
    .from("teams")
    .select("*")
    .in("id", teamIds)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(teams);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error('GET error:', error);
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 });
  }
}

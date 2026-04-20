import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, role } = await req.json();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  // 1. Find the project and its team
  const { data: project } = await supabase
    .from("projects")
    .select("team_id, user_id")
    .eq("id", params.projectId)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // 2. Security Check: Only project owner or team admin can invite
  let canInvite = project.user_id === user.id;
  
  if (project.team_id && !canInvite) {
      const { data: membership } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", project.team_id)
        .eq("user_id", user.id)
        .single();
      
      if (membership && ["owner", "admin"].includes(membership.role)) {
          canInvite = true;
      }
  }

  if (!canInvite) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  // 3. If no team exists for this project, create one (Ad-hoc Collaboration Team)
  let teamId = project.team_id;
  if (!teamId) {
      const { data: newTeam, error: teamError } = await supabase
        .from("teams")
        .insert({ 
            name: `Project: ${params.projectId.slice(0, 8)}`, 
            slug: `collab-${params.projectId}`,
            owner_id: user.id 
        })
        .select()
        .single();
      
      if (teamError) return NextResponse.json({ error: teamError.message }, { status: 500 });
      
      teamId = newTeam.id;

      // Update project with team association
      await supabase.from("projects").update({ team_id: teamId }).eq("id", params.projectId);

      // Add owner as member
      await supabase.from("team_members").insert({
        team_id: teamId,
        user_id: user.id,
        role: "owner",
        accepted_at: new Date().toISOString(),
      });
  }

  // 4. Send the invite
  const { data: invite, error: inviteError } = await supabase
    .from("team_invites")
    .insert({
      team_id: teamId,
      email,
      role: role || "editor",
      invited_by: user.id,
    })
    .select()
    .single();

  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });

  return NextResponse.json({ success: true, inviteId: invite.id });
}

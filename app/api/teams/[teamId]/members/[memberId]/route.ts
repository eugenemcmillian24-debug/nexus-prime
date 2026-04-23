import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/apiError";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { teamId: string; memberId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = await req.json();

  const { data, error } = await supabase
    .from("team_members")
    .update({ role })
    .eq("id", params.memberId)
    .eq("team_id", params.teamId)
    .select()
    .single();

  if (error) return errorResponse(error, '/api/teams/[teamId]/members/[memberId]');
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { teamId: string; memberId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", params.memberId)
    .eq("team_id", params.teamId);

  if (error) return errorResponse(error, '/api/teams/[teamId]/members/[memberId]');
  return NextResponse.json({ success: true });
}

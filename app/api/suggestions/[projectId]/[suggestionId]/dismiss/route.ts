import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { errorResponse } from "@/lib/apiError";

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; suggestionId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, suggestionId } = params;

  const { error } = await supabase
    .from("ai_suggestions")
    .update({ dismissed: true })
    .eq("id", suggestionId)
    .eq("project_id", projectId);

  if (error) return errorResponse(error, '/api/suggestions/[projectId]/[suggestionId]/dismiss');

  return NextResponse.json({ success: true });
}

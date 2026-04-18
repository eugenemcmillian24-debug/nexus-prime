import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; suggestionId: string } }
) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, suggestionId } = params;

  const { error } = await supabase
    .from("ai_suggestions")
    .update({ dismissed: true })
    .eq("id", suggestionId)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

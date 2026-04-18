import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; suggestionId: string } }
) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, suggestionId } = params;

  const { data, error } = await supabase
    .from("ai_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .eq("project_id", projectId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    type: data.type,
    title: data.title,
    description: data.description,
    code: data.code,
    file: data.file_path,
    line: data.line_number,
    confidence: data.confidence,
    impact: data.impact,
    applied: data.applied,
    dismissed: data.dismissed,
  });
  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = params;
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  const { data, error } = await supabase
    .from("ai_suggestions")
    .select("*")
    .eq("project_id", projectId)
    .eq("file_path", path)
    .eq("dismissed", false)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data.map(s => ({
    id: s.id,
    type: s.type,
    title: s.title,
    description: s.description,
    code: s.code,
    file: s.file_path,
    line: s.line_number,
    confidence: s.confidence,
    impact: s.impact,
    applied: s.applied,
    dismissed: s.dismissed,
  })));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error('GET error:', error);
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 });
  }
}

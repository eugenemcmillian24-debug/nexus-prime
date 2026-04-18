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

  // Get suggestion details
  const { data: suggestion, error: fetchError } = await supabase
    .from("ai_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .eq("project_id", projectId)
    .single();

  if (fetchError || !suggestion) {
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  }

  // If there's code and a file path, we should apply it to project_files
  if (suggestion.code && suggestion.file_path) {
    // Basic implementation: replace entire file or append
    // In a real app, this might be a patch
    const { error: fileError } = await supabase
      .from("project_files")
      .upsert({
        project_id: projectId,
        path: suggestion.file_path,
        content: suggestion.code,
        updated_at: new Date().toISOString(),
      }, { onConflict: "project_id,path" });

    if (fileError) return NextResponse.json({ error: fileError.message }, { status: 500 });
  }

  // Mark as applied
  const { error } = await supabase
    .from("ai_suggestions")
    .update({ applied: true })
    .eq("id", suggestionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

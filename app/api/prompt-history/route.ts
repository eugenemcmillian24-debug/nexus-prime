import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { errorResponse } from "@/lib/apiError";

// GET /api/prompt-history?projectId=...&sort=newest
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  const sort = req.nextUrl.searchParams.get("sort") || "newest";

  let query = supabase
    .from("prompt_history")
    .select("*")
    .eq("user_id", user.id);

  if (projectId) query = query.eq("project_id", projectId);

  switch (sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "cost":
      query = query.order("cost", { ascending: false });
      break;
    case "tokens":
      query = query.order("tokens_total", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(200);
  if (error) return errorResponse(error, '/api/prompt-history');

  return NextResponse.json(
    data.map((entry) => ({
      id: entry.id,
      prompt: entry.prompt,
      response: entry.response,
      model: entry.model,
      templateId: entry.template_id,
      templateName: entry.template_name,
      tokens: {
        input: entry.tokens_input,
        output: entry.tokens_output,
        total: entry.tokens_total,
      },
      cost: parseFloat(entry.cost || "0"),
      duration: entry.duration_ms,
      rating: entry.rating,
      tags: entry.tags || [],
      starred: entry.starred,
      createdAt: entry.created_at,
    }))
  );
}

// POST /api/prompt-history - Record a new prompt
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const { data, error } = await supabase
    .from("prompt_history")
    .insert({
      project_id: body.projectId,
      user_id: user.id,
      prompt: body.prompt,
      response: body.response,
      model: body.model || "groq",
      template_id: body.templateId || null,
      template_name: body.templateName || null,
      tokens_input: body.tokens?.input || 0,
      tokens_output: body.tokens?.output || 0,
      tokens_total: body.tokens?.total || 0,
      cost: body.cost || 0,
      duration_ms: body.duration || 0,
      tags: body.tags || [],
    })
    .select()
    .single();

  if (error) return errorResponse(error, '/api/prompt-history');
  return NextResponse.json(data);
}

import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { z, ZodError } from "zod";

let _supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

const ComponentQuerySchema = z.object({
  userId: z.string().uuid(),
  category: z.string().optional(),
  search: z.string().optional(),
});

const CreateComponentSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  code: z.string().min(1).max(50000),
  category: z.enum(["ui", "layout", "form", "data", "navigation", "animation", "other"]).default("ui"),
  tags: z.array(z.string()).max(10).default([]),
  is_public: z.boolean().default(false),
});

// GET: Fetch saved components
export async function GET(req: Request) {
  try {
    const supabase = getSupabase();
    const url = new URL(req.url);
    const params = ComponentQuerySchema.parse({
      userId: url.searchParams.get("userId"),
      category: url.searchParams.get("category") || undefined,
      search: url.searchParams.get("search") || undefined,
    });

    let query = supabase
      .from("saved_components")
      .select("*")
      .or(`user_id.eq.${params.userId},is_public.eq.true`)
      .order("usage_count", { ascending: false });

    if (params.category) query = query.eq("category", params.category);
    if (params.search) query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);

    const { data, error } = await query;
    if (error) throw error;

    const response = NextResponse.json(data);
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid parameters", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Save a new component
export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const params = CreateComponentSchema.parse(body);

    const { data, error } = await supabase
      .from("saved_components")
      .insert({
        user_id: params.userId,
        name: params.name,
        description: params.description,
        code: params.code,
        category: params.category,
        tags: params.tags,
        is_public: params.is_public,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z, ZodError } from "zod";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TemplateQuerySchema = z.object({
  userId: z.string().uuid(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
});

const CreateTemplateSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  prompt: z.string().min(1).max(5000),
  category: z.enum(["landing", "dashboard", "ecommerce", "portfolio", "saas", "mobile", "game", "custom"]).default("custom"),
  tags: z.array(z.string()).max(10).default([]),
  is_public: z.boolean().default(false),
});

// GET: Fetch templates
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const params = TemplateQuerySchema.parse({
      userId: url.searchParams.get("userId"),
      category: url.searchParams.get("category") || undefined,
      search: url.searchParams.get("search") || undefined,
      page: Number(url.searchParams.get("page") || 1),
      limit: Number(url.searchParams.get("limit") || 20),
    });

    let query = supabase
      .from("prompt_templates")
      .select("*", { count: "exact" })
      .or(`user_id.eq.${params.userId},is_public.eq.true,is_system.eq.true`)
      .order("usage_count", { ascending: false })
      .range((params.page - 1) * params.limit, params.page * params.limit - 1);

    if (params.category) query = query.eq("category", params.category);
    if (params.search) query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({ templates: data, total: count });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid parameters", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new template
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const params = CreateTemplateSchema.parse(body);

    const { data, error } = await supabase
      .from("prompt_templates")
      .insert({
        user_id: params.userId,
        title: params.title,
        description: params.description,
        prompt: params.prompt,
        category: params.category,
        tags: params.tags,
        is_public: params.is_public,
        is_system: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

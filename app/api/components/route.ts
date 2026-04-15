import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z, ZodError } from "zod";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SaveComponentSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  code: z.string().min(1),
  tags: z.array(z.string()).max(10).default([]),
  isPublic: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, name, description, code, tags, isPublic } =
      SaveComponentSchema.parse(body);

    const { data: component, error } = await supabase
      .from("saved_components")
      .insert({
        user_id: userId,
        name,
        description,
        code,
        tags,
        is_public: isPublic,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ component });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Components API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const search = searchParams.get("search");
  const tag = searchParams.get("tag");
  const publicOnly = searchParams.get("public") === "true";

  let query = supabase.from("saved_components").select("*");

  if (publicOnly) {
    query = query.eq("is_public", true);
  } else if (userId) {
    query = query.eq("user_id", userId);
  }

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch components" }, { status: 500 });
  }

  return NextResponse.json({ components: data || [] });
}

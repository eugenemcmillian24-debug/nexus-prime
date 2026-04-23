import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { z, ZodError } from "zod";

const PublishSchema = z.object({
  userId: z.string().uuid(),
  jobId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).max(5).default([]),
});

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    const body = await req.json();
    const { jobId, title, description, tags } = PublishSchema.parse({ ...body, userId: user.id });

    // Verify user owns the job
    const { data: job } = await supabase
      .from("agent_jobs")
      .select("id, user_id, result")
      .eq("id", jobId)
      .single();

    if (!job || job.user_id !== userId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check if already published
    const { data: existing } = await supabase
      .from("published_builds")
      .select("id")
      .eq("job_id", jobId)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Build already published" }, { status: 409 });
    }

    const { data: published, error } = await supabase
      .from("published_builds")
      .insert({
        user_id: userId,
        job_id: jobId,
        title,
        description,
        tags,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ published });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Gallery API Error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "12"), 50);
  const tag = searchParams.get("tag");
  const sort = searchParams.get("sort") || "latest";

  let query = supabase
    .from("published_builds")
    .select(`
      *,
      profiles:user_id (email, full_name, avatar_url)
    `, { count: "exact" });

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  if (sort === "popular") {
    query = query.order("likes_count", { ascending: false });
  } else if (sort === "views") {
    query = query.order("views_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch gallery" }, { status: 500 });
  }

  return NextResponse.json({
    builds: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

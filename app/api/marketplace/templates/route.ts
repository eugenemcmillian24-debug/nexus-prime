import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";

// GET /api/marketplace/templates?category=coding&sort=popular&q=react
export async function GET(req: NextRequest) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const category = req.nextUrl.searchParams.get("category");
  const sort = req.nextUrl.searchParams.get("sort") || "popular";
  const query = req.nextUrl.searchParams.get("q");

  let q = supabase
    .from("marketplace_templates")
    .select(`
      id, name, description, category, tags, prompt, variables,
      downloads, likes, rating, review_count, is_featured,
      created_at, updated_at, author_id
    `)
    .eq("is_published", true);

  if (category) q = q.eq("category", category);
  if (query) q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%`);

  switch (sort) {
    case "newest":
      q = q.order("created_at", { ascending: false });
      break;
    case "top-rated":
      q = q.order("rating", { ascending: false });
      break;
    case "most-downloaded":
      q = q.order("downloads", { ascending: false });
      break;
    default:
      q = q.order("is_featured", { ascending: false }).order("downloads", { ascending: false });
  }

  const { data, error } = await q.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check which ones user has liked
  let likedIds = new Set<string>();
  if (user) {
    const { data: likes } = await supabase
      .from("marketplace_likes")
      .select("template_id")
      .eq("user_id", user.id);
    likedIds = new Set((likes || []).map((l) => l.template_id));
  }

  // Fetch author profiles
  const authorIds = Array.from(new Set(data?.map((t) => t.author_id) || []));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", authorIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, { id: p.id, name: p.full_name || "Anonymous", avatar: p.avatar_url }])
  );

  const response = NextResponse.json(
  return NextResponse.json(
    (data || []).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      tags: t.tags || [],
      prompt: t.prompt,
      variables: t.variables || [],
      downloads: t.downloads,
      likes: t.likes,
      isLiked: likedIds.has(t.id),
      isFeatured: t.is_featured,
      rating: parseFloat(t.rating || "0"),
      reviewCount: t.review_count,
      author: profileMap.get(t.author_id) || { id: t.author_id, name: "Anonymous" },
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }))
  );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error('GET error:', error);
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/marketplace/templates - Publish a template
export async function POST(req: NextRequest) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const { data, error } = await supabase
    .from("marketplace_templates")
    .insert({
      author_id: user.id,
      name: body.name,
      description: body.description,
      category: body.category || "coding",
      tags: body.tags || [],
      prompt: body.prompt,
      variables: body.variables || [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error('POST error:', error);
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 });
  }
}

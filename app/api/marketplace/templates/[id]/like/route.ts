import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Toggle like
  const { data: existing } = await supabase
    .from("template_likes")
    .select("id")
    .eq("template_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    await supabase.from("template_likes").delete().eq("id", existing.id);
    return NextResponse.json({ liked: false });
  } else {
    await supabase.from("template_likes").insert({ template_id: params.id, user_id: user.id });
    return NextResponse.json({ liked: true });
  }
}

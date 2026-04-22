import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: key } = await supabase
    .from("api_keys")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  // Update last_used
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", params.id);

  return NextResponse.json({ success: true, message: "API key is valid" });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";

// GET /api/keys - List user's API keys
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, provider, label, key_preview, is_active, usage_count, last_used_at, rate_limits, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    data.map((k) => ({
      id: k.id,
      provider: k.provider,
      label: k.label,
      keyPreview: k.key_preview,
      isActive: k.is_active,
      usageCount: k.usage_count,
      lastUsedAt: k.last_used_at,
      rateLimits: k.rate_limits,
      createdAt: k.created_at,
    }))
  );
}

// POST /api/keys - Add a new API key
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider, label, key } = await req.json();
  if (!provider || !key) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Create masked preview (first 4 + last 6 chars)
  const preview = key.length > 12
    ? `${key.slice(0, 4)}...${key.slice(-6)}`
    : "****";

  // In production: encrypt key with per-user key via KMS
  // For now, basic XOR obfuscation placeholder
  const encrypted = Buffer.from(key).toString("base64");

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: user.id,
      provider,
      label: label || `${provider} key`,
      key_encrypted: encrypted,
      key_preview: preview,
    })
    .select("id, provider, label, key_preview, is_active, usage_count, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { errorResponse } from "@/lib/apiError";

// Helper to generate a random token
function generateToken() {
  const buffer = new Uint8Array(32);
  globalThis.crypto.getRandomValues(buffer);
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Helper to hash a token
async function hashToken(token: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = params;

  // Verify ownership
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("api_tokens")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error, '/api/projects/[projectId]/tokens');

  return NextResponse.json(data.map(t => ({
    id: t.id,
    name: t.name,
    tokenPreview: t.token_preview,
    scopes: t.scopes,
    lastUsed: t.last_used_at,
    expiresAt: t.expires_at,
    requestCount: t.request_count,
    createdAt: t.created_at,
  })));
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = params;
  const { name, scopes, expiresInDays } = await req.json();

  if (!name || !scopes) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify ownership
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
  }

  const rawToken = `nxp_${generateToken()}`;
  const tokenHash = await hashToken(rawToken);
  const tokenPreview = `${rawToken.slice(0, 8)}...${rawToken.slice(-4)}`;
  
  let expiresAt = null;
  if (expiresInDays > 0) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  const { data, error } = await supabase
    .from("api_tokens")
    .insert({
      project_id: projectId,
      user_id: user.id,
      name,
      token_hash: tokenHash,
      token_preview: tokenPreview,
      scopes,
      expires_at: expiresAt?.toISOString(),
    })
    .select()
    .single();

  if (error) return errorResponse(error, '/api/projects/[projectId]/tokens');

  return NextResponse.json({
    token: rawToken,
    tokenMeta: {
      id: data.id,
      name: data.name,
      tokenPreview: data.token_preview,
      scopes: data.scopes,
      lastUsed: data.last_used_at,
      expiresAt: data.expires_at,
      requestCount: data.request_count,
      createdAt: data.created_at,
    }
  });
}

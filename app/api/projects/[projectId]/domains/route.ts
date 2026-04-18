import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .from("custom_domains")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data.map(d => ({
    id: d.id,
    domain: d.domain,
    status: d.status,
    sslStatus: d.ssl_status,
    dnsRecords: d.dns_records,
    createdAt: d.created_at,
    verifiedAt: d.verified_at,
    expiresAt: d.expires_at,
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
  const { domain } = await req.json();

  if (!domain) {
    return NextResponse.json({ error: "Missing domain" }, { status: 400 });
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

  // 2. CHECK PROTOCOL FEE (One-time $10 / 10 Credits)
  const { data: existingDomain } = await supabase
    .from("custom_domains")
    .select("protocol_fee_paid")
    .eq("project_id", projectId)
    .single();

  if (!existingDomain?.protocol_fee_paid) {
     const { data: result, error: rpcError } = await supabase.rpc('deduct_user_credits', {
        target_user_id: user.id,
        amount_to_deduct: 10
      });

      if (rpcError || !result.success) {
        return NextResponse.json(
          { error: 'Protocol Fee Required: 10 Credits to link a custom domain.' },
          { status: 402 }
        );
      }
  }

  // Initial DNS records for verification
  const dnsRecords = [
    { type: "CNAME", name: "@", value: "cname.nexusprime.app", verified: false },
    { type: "TXT", name: "_nexus-challenge", value: `nxp-${projectId.slice(0, 8)}`, verified: false }
  ];

  const { data, error } = await supabase
    .from("custom_domains")
    .insert({
      project_id: projectId,
      domain,
      dns_records: dnsRecords,
      protocol_fee_paid: true // Marked as paid after successful deduction
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Domain already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    domain: data.domain,
    status: data.status,
    sslStatus: data.ssl_status,
    dnsRecords: data.dns_records,
    createdAt: data.created_at,
    verifiedAt: data.verified_at,
    expiresAt: data.expires_at,
  });
}

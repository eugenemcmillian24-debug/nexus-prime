import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; domainId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, domainId } = params;

  // Verify ownership via project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
  }

  // Mock DNS verification
  // In a real scenario, we'd use a DNS library to check records
  
  const { data: domain, error: fetchError } = await supabase
    .from("custom_domains")
    .select("*")
    .eq("id", domainId)
    .eq("project_id", projectId)
    .single();
    
  if (fetchError || !domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  // Update records to 'verified' and status to 'active'
  const updatedRecords = (domain.dns_records as any[] || []).map(r => ({ ...r, verified: true }));
  
  const { data, error } = await supabase
    .from("custom_domains")
    .update({
      status: "active",
      ssl_status: "active",
      dns_records: updatedRecords,
      verified_at: new Date().toISOString(),
    })
    .eq("id", domainId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

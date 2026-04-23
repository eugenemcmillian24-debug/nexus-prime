import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { z, ZodError } from "zod";
import { errorResponse } from "@/lib/apiError";

const CreateOrgSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
});

const InviteMemberSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  inviteeEmail: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    const body = await req.json();
    const action = body.action;

    if (action === "create") {
      const { name, slug } = CreateOrgSchema.parse({ ...body, userId: user.id });

      const { data: org, error } = await supabase
        .from("organizations")
        .insert({ name, slug, owner_id: userId })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json({ error: "Organization slug already taken" }, { status: 409 });
        }
        throw error;
      }

      // Add owner as member
      await supabase.from("org_members").insert({
        organization_id: org.id,
        user_id: userId,
        role: "owner",
      });

      // Create credit pool
      await supabase.from("org_credit_pools").insert({
        organization_id: org.id,
        balance: 0,
      });

      return NextResponse.json({ organization: org });
    }

    if (action === "invite") {
      const { organizationId, inviteeEmail, role } = InviteMemberSchema.parse({ ...body, userId: user.id });

      // Verify requester is admin/owner
      const { data: membership } = await supabase
        .from("org_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .single();

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }

      // Find invitee by email
      const { data: invitee } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteeEmail)
        .single();

      if (!invitee) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const { error } = await supabase.from("org_members").insert({
        organization_id: organizationId,
        user_id: invitee.id,
        role,
      });

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json({ error: "User already a member" }, { status: 409 });
        }
        throw error;
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return errorResponse(error, "Org API Error");
  }
}

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const { data: memberships } = await supabase
    .from("org_members")
    .select(`
      role,
      organizations (id, name, slug, avatar_url, created_at),
      org_credit_pools:organizations!inner (
        org_credit_pools (balance, lifetime_credits)
      )
    `)
    .eq("user_id", userId);

  return NextResponse.json({ organizations: memberships || [] });
}

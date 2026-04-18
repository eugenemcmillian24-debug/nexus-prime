import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { z, ZodError } from "zod";

const CreateReferralSchema = z.object({
  userId: z.string().uuid(),
});

const RedeemReferralSchema = z.object({
  userId: z.string().uuid(),
  referralCode: z.string().min(1),
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
      const { userId } = CreateReferralSchema.parse({ ...body, userId: user.id });

      // Get or create referral code
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", userId)
        .single();

      if (!profile?.referral_code) {
        const code = "NX-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        await supabase.from("profiles").update({ referral_code: code }).eq("id", userId);

        // Create referral record
        await supabase.from("referrals").insert({
          referrer_id: userId,
          referral_code: code,
        });

        return NextResponse.json({ referralCode: code });
      }

      return NextResponse.json({ referralCode: profile.referral_code });
    }

    if (action === "redeem") {
      const { userId, referralCode } = RedeemReferralSchema.parse({ ...body, userId: user.id });

      // Check user hasn't already been referred
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("referred_by")
        .eq("id", userId)
        .single();

      if (existingProfile?.referred_by) {
        return NextResponse.json({ error: "Already used a referral code" }, { status: 400 });
      }

      // Complete referral
      const { data: result } = await supabase.rpc("complete_referral", {
        p_referral_code: referralCode,
        p_new_user_id: userId,
      });

      if (!result?.success) {
        return NextResponse.json({ error: result?.error || "Invalid referral code" }, { status: 400 });
      }

      return NextResponse.json({ success: true, creditsAwarded: result.credits_awarded });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Referral API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const { data: referrals } = await supabase
    .from("referrals")
    .select("*")
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", userId)
    .single();

  return NextResponse.json({
    referralCode: profile?.referral_code,
    referrals: referrals || [],
    totalReferred: referrals?.filter((r: any) => r.status === "completed").length || 0,
    totalCreditsEarned: referrals?.reduce((sum: number, r: any) => sum + (r.credits_awarded_referrer || 0), 0) || 0,
  });
  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

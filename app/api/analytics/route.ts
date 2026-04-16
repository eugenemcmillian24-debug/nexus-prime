import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z, ZodError } from "zod";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const AnalyticsQuerySchema = z.object({
  userId: z.string().uuid(),
  days: z.number().min(1).max(365).default(30),
});

// GET: Fetch user analytics
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const params = AnalyticsQuerySchema.parse({
      userId: url.searchParams.get("userId"),
      days: Number(url.searchParams.get("days") || 30),
    });

    const { data, error } = await supabase.rpc("get_user_analytics", {
      p_user_id: params.userId,
      p_days: params.days,
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid parameters", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Track a usage event
const TrackEventSchema = z.object({
  userId: z.string().uuid(),
  eventType: z.enum(["generation", "refinement", "deployment", "export", "gallery_publish", "voice_input", "screenshot_upload"]),
  metadata: z.record(z.any()).default({}),
  creditsUsed: z.number().min(0).default(0),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const params = TrackEventSchema.parse(body);

    const { error } = await supabase.from("usage_events").insert({
      user_id: params.userId,
      event_type: params.eventType,
      metadata: params.metadata,
      credits_used: params.creditsUsed,
    });

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

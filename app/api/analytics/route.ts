import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { z, ZodError } from "zod";

export const dynamic = 'force-dynamic';

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) 
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null as any;

const AnalyticsQuerySchema = z.object({
  userId: z.string().uuid(),
  days: z.number().min(1).max(365).default(30),
});

// GET: Fetch user analytics
export async function GET(req: Request) {
  try {
    const supabaseClient = createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const requestedUserId = url.searchParams.get("userId");
    
    // SECURITY: Users can only see their own analytics unless they are admin
    if (requestedUserId !== user.id) {
        // We'll allow the request to proceed if the user is an admin (checked later or via middleware)
        // But for standard users, we force their ID
        const { data: credits } = await supabase.from('user_credits').select('tier').eq('user_id', user.id).single();
        if (credits?.tier !== 'admin') {
            return NextResponse.json({ error: "Forbidden: You can only view your own analytics." }, { status: 403 });
        }
    }

    const params = AnalyticsQuerySchema.parse({
      userId: requestedUserId,
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
    const supabaseClient = createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const params = TrackEventSchema.parse(body);

    // SECURITY: Ensure user is tracking for themselves
    if (params.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden: Cannot spoof analytics for other users." }, { status: 403 });
    }

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

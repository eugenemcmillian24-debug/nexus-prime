import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';
import { aiComplete } from '@/lib/ai';

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { messages, options } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    const zenKey = process.env.OPENCODE_ZEN_API_KEY;
    if (!zenKey) {
      return NextResponse.json({ error: "Zen API key not configured" }, { status: 500 });
    }

    const response = await aiComplete(messages, {
      ...options,
      zenKey
    });

    return NextResponse.json({ content: response });
  } catch (error: any) {
    console.error('[AI API Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

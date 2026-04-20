import { NextResponse } from 'next/server';
import { NexusOrchestrator } from '@/lib/ai';
import { createClient } from '@/lib/supabase/api';
import { ZodError } from 'zod';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as Blob;

    // 1. INPUT VALIDATION (Manual for Blobs in FormData)
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Invalid audio file provided' }, { status: 400 });
    }

    const orchestrator = new NexusOrchestrator({
      groqKey: process.env.GROQ_API_KEY!,
      openRouterKey: process.env.OPENROUTER_API_KEY!,
      googleAIKey: process.env.GOOGLE_AI_KEY!,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const text = await orchestrator.transcribe(file);

    return NextResponse.json({ text });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Input Validation Failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Transcription API Error:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}

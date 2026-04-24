import { NextResponse } from 'next/server';
import { NexusOrchestrator } from '@/lib/ai';
import { createClient } from '@/lib/supabase/api';
import { ZodError } from 'zod';
import { errorResponse } from '@/lib/apiError';

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
      zenKey: process.env.OPENCODE_ZEN_API_KEY!,
      supabaseUrl: (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!,
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
    return errorResponse(error, 'Transcription API Error');
  }
}

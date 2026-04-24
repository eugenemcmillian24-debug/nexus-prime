import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NexusOrchestrator } from '@/lib/ai';
import { errorResponse } from "@/lib/apiError";
import { z } from 'zod';

const PerformanceSchema = z.object({
  projectId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { projectId } = PerformanceSchema.parse(body);

    const orchestrator = new NexusOrchestrator({
      zenKey: process.env.OPENCODE_ZEN_API_KEY!,
      supabaseUrl: (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const { data: files } = await supabase
      .from('project_files')
      .select('path, content')
      .eq('project_id', projectId);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files found' }, { status: 404 });
    }

    const optimizations = await orchestrator.analyzePerformance(files);

    return NextResponse.json({ optimizations });

  } catch (error: any) {
    return errorResponse(error, "Performance Analysis API Error:");
  }
}

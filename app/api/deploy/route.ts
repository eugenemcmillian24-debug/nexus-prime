import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';
import { NexusOrchestrator } from '@/lib/ai';
import { z, ZodError } from 'zod';

const DeploySchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  projectName: z.string().min(1).max(100).optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    const body = await req.json();

    // 1. INPUT VALIDATION (Zod Hardening)
    // We ensure the userId used is the authenticated one
    const { jobId, projectName } = DeploySchema.parse({ ...body, userId: user.id });

    // 2. Fetch Job Result
    const { data: job, error: jobError } = await supabase
      .from('agent_jobs')
      .select('result, user_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // 3. Security Check (Ensure user owns the job)
    if (job.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized Deployment' }, { status: 403 });
    }

    const files = job.result?.code?.files;
    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'No files found in the job result' }, { status: 400 });
    }

    // 4. Deploy to Vercel
    const orchestrator = new NexusOrchestrator({
      groqKey: process.env.GROQ_API_KEY!,
      openRouterKey: process.env.OPENROUTER_API_KEY!,
      googleAIKey: process.env.GOOGLE_AI_KEY!,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const deployment = await orchestrator.deployToVercel(files, projectName || `nexus-build-${jobId.slice(0, 8)}`);

    return NextResponse.json(deployment);

  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Input Validation Failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Deployment API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

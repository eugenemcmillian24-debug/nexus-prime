import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NexusOrchestrator } from '@/lib/ai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { jobId, projectName, userId } = await req.json();

    // 1. Fetch Job Result
    const { data: job, error: jobError } = await supabase
      .from('agent_jobs')
      .select('result, user_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // 2. Security Check (Ensure user owns the job)
    if (job.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized Deployment' }, { status: 403 });
    }

    const files = job.result?.code?.files;
    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'No files found in the job result' }, { status: 400 });
    }

    // 3. Deploy to Vercel
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
    console.error('Deployment API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

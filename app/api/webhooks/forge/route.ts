import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NexusOrchestrator } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Identify source (GitHub or Vercel)
    const userAgent = req.headers.get('user-agent') || '';
    
    if (userAgent.includes('GitHub-Hookshot')) {
      return handleGitHubWebhook(body, supabase);
    } else if (body.type?.startsWith('deployment.')) {
      return handleVercelWebhook(body, supabase);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function handleGitHubWebhook(payload: any, supabase: any) {
  // Handle PR status updates, etc.
  console.log('GitHub Webhook received:', payload.action);
  return NextResponse.json({ ok: true });
}

async function handleVercelWebhook(payload: any, supabase: any) {
  const deploymentId = payload.payload?.deployment?.id || payload.payload?.id;
  if (!deploymentId) return NextResponse.json({ ok: true });

  // Find the job associated with this deployment
  const { data: job } = await supabase
    .from('agent_jobs')
    .select('id')
    .contains('step_data', { deployment_id: deploymentId })
    .single();

  if (job) {
    const orchestrator = new NexusOrchestrator({
      zenKey: process.env.OPENCODE_ZEN_API_KEY!,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    // Trigger next step
    await orchestrator.processNextStep(job.id);
  }

  return NextResponse.json({ ok: true });
}

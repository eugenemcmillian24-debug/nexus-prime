import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';
import { NexusOrchestrator } from '@/lib/ai';
import { errorResponse } from "@/lib/apiError";
import { z, ZodError } from 'zod';

export const dynamic = 'force-dynamic';

// userId is intentionally NOT part of the schema — the route always uses the
// authenticated user's id from the session, and trusting a client-supplied
// userId here would be a confused-deputy vulnerability.
const DeploySchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
  projectName: z.string().min(1).max(100).optional(),
  platform: z.enum(['vercel', 'netlify', 'cloudflare']).default('vercel'),
});

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    const body = await req.json();
    const { jobId, projectName, platform } = DeploySchema.parse(body);

    // 2. Fetch Job Result
    const { data: job, error: jobError } = await supabase
      .from('agent_jobs')
      .select('result, user_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // 3. Security Check
    if (job.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized Deployment' }, { status: 403 });
    }

    const files = job.result?.code?.files;
    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'No files found in the job result' }, { status: 400 });
    }

    // Fetch user's agency config for white-labeling
    const { data: credits } = await supabase
      .from('user_credits')
      .select('agency_mode, agency_config')
      .eq('user_id', userId)
      .maybeSingle();

    const agencyConfig = (credits?.agency_mode) ? credits.agency_config : null;

    const orchestrator = new NexusOrchestrator({
      zenKey: process.env.OPENCODE_ZEN_API_KEY!,
      supabaseUrl: (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    let deployment;
    const name = projectName || `nexus-build-${jobId.slice(0, 8)}`;

    if (platform === 'vercel') {
      deployment = await orchestrator.deployToVercel(files, name);
    } else if (platform === 'netlify') {
      deployment = await orchestrator.deployToNetlify(files, name, agencyConfig);
    } else if (platform === 'cloudflare') {
      deployment = await orchestrator.deployToCloudflare(files, name, agencyConfig);
    }

    return NextResponse.json(deployment);

  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Input Validation Failed', details: error.errors },
        { status: 400 }
      );
    }
    return errorResponse(error, "Deployment API Error:");
  }
}

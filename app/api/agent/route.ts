import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NexusOrchestrator } from '@/lib/ai';
import { AgentJobSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { waitUntil } from '@vercel/functions';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 300; // 5 min max for orchestrator pipeline

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. INPUT VALIDATION (Zod Hardening)
    const { prompt, userId, imageUrl } = AgentJobSchema.parse(body);

    // 2. NEXUS GUARD: Atomic Credit Deduction
    const { data: result, error: rpcError } = await supabase.rpc('deduct_user_credits', {
      target_user_id: userId,
      amount_to_deduct: 10
    });

    if (rpcError || !result.success) {
      return NextResponse.json(
        { error: result?.error || 'Credit verification failed. Please check your balance.' },
        { status: 402 }
      );
    }

    // 3. Create Job
    const { data: job, error: jobError } = await supabase
      .from('agent_jobs')
      .insert({
        user_id: userId,
        status: 'pending',
        agent_type: 'builder',
        prompt,
        image_url: imageUrl,
        credits_cost: 10
      })
      .select()
      .single();

    if (jobError) {
      // Refund if job creation fails
      await supabase.rpc('deduct_user_credits', {
        target_user_id: userId,
        amount_to_deduct: -10
      });
      throw jobError;
    }

    // 4. Trigger Orchestrator (Background — waitUntil keeps function alive after response)
    const orchestrator = new NexusOrchestrator({
      groqKey: process.env.GROQ_API_KEY!,
      openRouterKey: process.env.OPENROUTER_API_KEY!,
      googleAIKey: process.env.GOOGLE_AI_KEY!,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    waitUntil(orchestrator.executeJob(job.id));

    return NextResponse.json({ jobId: job.id, newBalance: result.new_balance });

  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Input Validation Failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Agent API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

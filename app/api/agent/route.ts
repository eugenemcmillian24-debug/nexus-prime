import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';
import { NexusOrchestrator } from '@/lib/ai';
import { AgentJobSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { waitUntil } from '@vercel/functions';
import { isNexusPrimeAdmin, TIER_LIMITS, PREMIUM_AGENTS } from '@/lib/nexus_prime_access';
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const maxDuration = 300; // 5 min max for orchestrator pipeline

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    const body = await req.json();
    const { prompt, imageUrl, projectId, agentType, trainingModuleId } = body;

    // 0. RATE LIMIT (20 requests/min per user for AI agent calls)
    const rl = rateLimit(`agent:${userId}`, { limit: 20, windowSeconds: 60 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // 1. DETERMINE COST
    const { data: userCredits } = await supabase
      .from("user_credits")
      .select("tier")
      .eq("user_id", userId)
      .single();
    
    const tier = userCredits?.tier || 'Free';
    const baseCost = (TIER_LIMITS as any)[tier]?.buildCost ?? 10;
    
    // Check if it's a premium agent
    const premiumAgent = PREMIUM_AGENTS.find(a => a.id === agentType);
    let totalCost = premiumAgent ? premiumAgent.cost : baseCost;

    // Custom Training Module Surcharge
    if (trainingModuleId) {
      totalCost += 5;
    }

    // 2. NEXUS GUARD: Atomic Credit Deduction
    const isAdmin = await isNexusPrimeAdmin();
    let result = { success: true, new_balance: Infinity };

    if (!isAdmin) {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('deduct_user_credits', {
        target_user_id: userId,
        amount_to_deduct: totalCost
      });
      
      if (rpcError || !rpcResult.success) {
        return NextResponse.json(
          { error: rpcResult?.error || 'Credit verification failed. Please check your balance.' },
          { status: 402 }
        );
      }
      result = rpcResult;
    }

    // 3. Create Job
    const { data: job, error: jobError } = await supabase
      .from('agent_jobs')
      .insert({
        user_id: userId,
        status: 'pending',
        agent_type: agentType || 'builder',
        prompt,
        image_url: imageUrl,
        project_id: projectId,
        credits_cost: totalCost,
        training_module_id: trainingModuleId || null
      })
      .select()
      .single();

    if (jobError) {
      if (!isAdmin) {
        await supabase.rpc('deduct_user_credits', {
          target_user_id: userId,
          amount_to_deduct: -totalCost
        });
      }
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

    waitUntil(orchestrator.executeJob(job.id, { isUnthrottled: isAdmin }));

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

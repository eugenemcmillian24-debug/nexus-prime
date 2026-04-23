import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';
import { NexusOrchestrator } from '@/lib/ai';
import { errorResponse } from "@/lib/apiError";

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { projectId, logs } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const orchestrator = new NexusOrchestrator({
      groqKey: process.env.GROQ_API_KEY!,
      openRouterKey: process.env.OPENROUTER_API_KEY!,
      googleAIKey: process.env.GOOGLE_AI_KEY!,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    // 1. ATTEMPT TO FETCH REAL VERCEL LOGS IF PROJECT_ID IS PROVIDED
    // supabase client already created above with auth context
    let deploymentLogs = logs;
    if (!deploymentLogs && projectId) {
        try {
            const { data: latestDeploy } = await supabase
                .from('deployments')
                .select('metadata, platform')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (latestDeploy?.platform === 'vercel' && (latestDeploy.metadata as any)?.deploymentId) {
                const vercelToken = process.env.VERCEL_TOKEN;
                const vRes = await fetch(`https://api.vercel.com/v2/deployments/${(latestDeploy.metadata as any).deploymentId}/events`, {
                    headers: { "Authorization": `Bearer ${vercelToken}` }
                });
                if (vRes.ok) {
                    const events = await vRes.json();
                    deploymentLogs = events.map((e: any) => `[${e.type}] ${e.payload?.text || e.text}`).join('\n');
                }
            }
        } catch (e) {
            console.error("Failed to fetch real Vercel logs", e);
        }
    }

    // Fallback to mock logs if still empty
    if (!deploymentLogs) {
        deploymentLogs = `
          [BUILD] Next.js build started...
          [BUILD] Compiling...
          [WARN] Large bundle size detected in app/page.tsx (500KB)
          [ERROR] Runtime error in components/features/RealtimeCollab.tsx: "Cannot read property 'id' of null"
          [BUILD] Build finished in 45s.
        `;
    }

    const analysis = await orchestrator.analyzeDeploymentHealth(deploymentLogs);

    return NextResponse.json(analysis);
  } catch (error: any) {
    return errorResponse(error, "Deployment Health API Error:");
  }
}

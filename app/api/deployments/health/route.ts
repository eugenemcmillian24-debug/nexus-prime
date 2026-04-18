import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NexusOrchestrator } from '@/lib/ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  try {
    const { projectId, logs } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const orchestrator = new NexusOrchestrator({
      groqKey: process.env.GROQ_API_KEY!,
      openRouterKey: process.env.OPENROUTER_API_KEY!,
      googleAIKey: process.env.GOOGLE_AI_KEY!,
      supabaseUrl,
      supabaseKey,
    });

    // Mock logs if not provided
    const deploymentLogs = logs || `
      [BUILD] Next.js build started...
      [BUILD] Compiling...
      [WARN] Large bundle size detected in app/page.tsx (500KB)
      [ERROR] Runtime error in components/features/RealtimeCollab.tsx: "Cannot read property 'id' of null"
      [BUILD] Build finished in 45s.
    `;

    const analysis = await orchestrator.analyzeDeploymentHealth(deploymentLogs);

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error('Deployment Health API Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

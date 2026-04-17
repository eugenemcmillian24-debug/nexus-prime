import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NexusOrchestrator } from '@/lib/ai';
import { z } from 'zod';

const PropSchema = z.object({
  projectId: z.string().uuid(),
  filePath: z.string(),
});

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { projectId, filePath } = PropSchema.parse(body);

    const orchestrator = new NexusOrchestrator({
      groqKey: process.env.GROQ_API_KEY!,
      openRouterKey: process.env.OPENROUTER_API_KEY!,
      googleAIKey: process.env.GOOGLE_AI_KEY!,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const { data: file } = await supabase
      .from('project_files')
      .select('content')
      .eq('project_id', projectId)
      .eq('path', filePath)
      .single();

    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const propData = await orchestrator.parseComponentProps(file.content);

    return NextResponse.json(propData);

  } catch (error: any) {
    console.error('Prop Parsing API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

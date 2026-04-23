import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NexusOrchestrator } from '@/lib/ai';
import { z } from 'zod';

const AuditSchema = z.object({
  projectId: z.string().uuid(),
  action: z.enum(['audit', 'fix']),
  vulnerability: z.any().optional(),
  filePath: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { projectId, action, vulnerability, filePath } = AuditSchema.parse(body);

    const orchestrator = new NexusOrchestrator({
      groqKey: process.env.GROQ_API_KEY!,
      openRouterKey: process.env.OPENROUTER_API_KEY!,
      googleAIKey: process.env.GOOGLE_AI_KEY!,
      supabaseUrl: (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    if (action === 'audit') {
      const { data: files } = await supabase
        .from('project_files')
        .select('path, content')
        .eq('project_id', projectId);

      if (!files || files.length === 0) {
        return NextResponse.json({ error: 'No files found' }, { status: 404 });
      }

      const report = await orchestrator.performSecurityAudit(files);
      return NextResponse.json({ report });
    }

    if (action === 'fix') {
      if (!vulnerability || !filePath) {
        return NextResponse.json({ error: 'Missing fix data' }, { status: 400 });
      }

      const { data: file } = await supabase
        .from('project_files')
        .select('path, content')
        .eq('project_id', projectId)
        .eq('path', filePath)
        .single();

      if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

      const fixedCode = await orchestrator.fixSecurityVulnerability(file, vulnerability);

      // Update the file in the project
      await supabase
        .from('project_files')
        .update({ content: fixedCode, updated_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .eq('path', filePath);

      return NextResponse.json({ success: true, fixedCode });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Security Audit API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

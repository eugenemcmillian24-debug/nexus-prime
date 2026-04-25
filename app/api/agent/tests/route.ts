import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NexusOrchestrator } from '@/lib/ai';
import { errorResponse } from "@/lib/apiError";
import { z } from 'zod';

const TestSchema = z.object({
  projectId: z.string().uuid(),
  filePaths: z.array(z.string()),
});

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { projectId, filePaths } = TestSchema.parse(body);

    const orchestrator = new NexusOrchestrator({
      zenKey: process.env.OPENCODE_ZEN_API_KEY!,
      supabaseUrl: (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    const { data: files } = await supabase
      .from('project_files')
      .select('path, content')
      .eq('project_id', projectId)
      .in('path', filePaths);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files found' }, { status: 404 });
    }

    const testFiles = await orchestrator.generateTests(files);

    // Save generated test files back to the project
    for (const testFile of testFiles) {
      await supabase
        .from('project_files')
        .upsert({
          project_id: projectId,
          path: testFile.path,
          content: testFile.content,
          language: 'typescript',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'project_id,path' });
    }

    return NextResponse.json({ success: true, testFiles });

  } catch (error: any) {
    return errorResponse(error, "Test Generation API Error:");
  }
}

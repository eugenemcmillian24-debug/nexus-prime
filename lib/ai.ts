import { Groq } from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

export interface AgentConfig {
  groqKey: string;
  openRouterKey: string;
  googleAIKey: string;
  supabaseUrl: string;
  supabaseKey: string;
}

const CODER_SYSTEM_PROMPT = `
You are the NEXUS PRIME Coder Agent. You produce high-fidelity, production-ready code.
STACK: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Lucide React.

RULES:
1. USE TYPESCRIPT STRICTLY: Interface every prop. No 'any'.
2. COMPONENT ARCHITECTURE: Prefer Server Components. Use 'use client' only when necessary.
3. DESIGN SYSTEM: Background: #050505, Accent: #00ff88, Font: JetBrains Mono.
4. MULTI-FILE OUTPUT: You MUST return a single JSON object. Do NOT include markdown blocks.
   Structure:
   {
     "files": [
       { "path": "string", "content": "string" }
     ]
   }
5. CLEAN CODE: Export clean, reusable components. Use 'cn()' utility.
6. OUTPUT: Return ONLY the raw JSON string. No conversational filler.

If the user asks for a feature, implement it fully across all necessary files.
`.trim();

const LINTER_SYSTEM_PROMPT = `
You are the NEXUS PRIME Linter Agent. You review code for errors, missing imports, and type mismatches.
STACK: Next.js 14, TypeScript, Tailwind, shadcn/ui, Lucide React.

RULES:
1. FIX SYNTAX ERRORS: Ensure every file is valid TypeScript.
2. MISSING IMPORTS: Check for 'lucide-react' icons or 'cn' utilities.
3. TYPE SAFETY: Fix any 'any' types or missing interfaces.
4. STRUCTURE: Maintain the same JSON structure as the Coder.
   { "files": [ { "path": "string", "content": "string" } ] }
5. OUTPUT: Return ONLY the corrected raw JSON string. No conversational filler.

If the code is already perfect, return the original JSON unchanged.
`.trim();

export class NexusOrchestrator {
  private groq: Groq;
  private supabase: any;
  private openRouterKey: string;
  private googleAIKey: string;

  constructor(config: AgentConfig) {
    this.groq = new Groq({ apiKey: config.groqKey });
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.openRouterKey = config.openRouterKey;
    this.googleAIKey = config.googleAIKey;
  }

  /**
   * Multi-Agent Execution Pipeline (Enhanced with Vision)
   * 1. Vision (Gemini 2.0 Flash) -> Visual Analysis (Optional)
   * 2. Reasoner (Qwen3-32B) -> Logic / Chain of Thought
   * 3. Orchestrator (Llama-70B) -> Plan / Tool Selection
   * 4. Coder (Llama-8B) -> Execution / Code Generation
   * 5. Linter (Llama-70B) -> Quality Assurance
   */
  async executeJob(jobId: string) {
    const { data: job } = await this.supabase.from('agent_jobs').select('*').eq('id', jobId).single();
    if (!job) return;

    try {
      await this.supabase.from('agent_jobs').update({ status: 'running' }).eq('id', jobId);

      let visualAnalysis = '';
      
      // STEP 0: VISION ANALYSIS (Gemini 2.0 Flash)
      if (job.image_url) {
        await this.logEvent(jobId, 'gemini-2.0-flash', 'thought', 'Analyzing screenshot with Gemini Vision...');
        visualAnalysis = await this.callGeminiVision(job.image_url, job.prompt);
        await this.logEvent(jobId, 'gemini-2.0-flash', 'completion', visualAnalysis);
      }

      // STEP 1: REASONING (Qwen3-32B — replaced deprecated DeepSeek-R1)
      await this.logEvent(jobId, 'qwen3-32b', 'thought', 'Initializing deep reasoning...');
      const reasoning = await this.callGroq('qwen/qwen3-32b', [
        { role: 'system', content: 'You are the Reasoner. Break down the user prompt and visual analysis into a logical architecture.' },
        { role: 'user', content: `Prompt: ${job.prompt}\nVisual Analysis: ${visualAnalysis}` }
      ]);
      await this.logEvent(jobId, 'qwen3-32b', 'completion', reasoning);

      // STEP 2: ORCHESTRATION (Llama-70B)
      await this.logEvent(jobId, 'llama-3.3-70b-versatile', 'thought', 'Generating execution plan based on reasoning...');
      const plan = await this.callGroq('llama-3.3-70b-versatile', [
        { role: 'system', content: 'You are the Orchestrator. Create a task list for the Coder agent.' },
        { role: 'user', content: `Reasoning: ${reasoning}\nPrompt: ${job.prompt}` }
      ]);
      await this.logEvent(jobId, 'llama-3.3-70b-versatile', 'completion', plan);

      // STEP 3: CODING (Llama-8B) - MULTI-FILE JSON
      await this.logEvent(jobId, 'llama-3.1-8b-instant', 'thought', 'Writing multi-file code structure...');
      const coderResponse = await this.callGroq('llama-3.1-8b-instant', [
        { role: 'system', content: CODER_SYSTEM_PROMPT },
        { role: 'user', content: `Plan: ${plan}` }
      ]);
      
      let initialCode;
      try {
        const jsonMatch = coderResponse.match(/\{[\s\S]*\}/);
        initialCode = JSON.parse(jsonMatch ? jsonMatch[0] : coderResponse);
        if (!initialCode?.files || !Array.isArray(initialCode.files)) {
          initialCode = { files: [{ path: "app/page.tsx", content: coderResponse }] };
        }
      } catch (e) {
        initialCode = { files: [{ path: "app/page.tsx", content: coderResponse }] };
      }
      await this.logEvent(jobId, 'llama-3.1-8b-instant', 'completion', `Generated ${initialCode.files?.length || 1} files`);

      // STEP 4: LINTING (Llama-70B) - QUALITY ASSURANCE
      await this.logEvent(jobId, 'llama-3.3-70b-versatile', 'thought', 'Reviewing code for syntax and type safety...');
      const linterResponse = await this.callGroq('llama-3.3-70b-versatile', [
        { role: 'system', content: LINTER_SYSTEM_PROMPT },
        { role: 'user', content: `Initial Code: ${JSON.stringify(initialCode)}\nPlan: ${plan}` }
      ]);

      let finalCode;
      try {
        const jsonMatch = linterResponse.match(/\{[\s\S]*\}/);
        finalCode = JSON.parse(jsonMatch ? jsonMatch[0] : linterResponse);
        if (!finalCode?.files || !Array.isArray(finalCode.files)) {
          finalCode = initialCode;
        }
      } catch (e) {
        finalCode = initialCode; // Fallback to initial code if linter fails
      }
      await this.logEvent(jobId, 'llama-3.3-70b-versatile', 'completion', 'Quality assurance complete. Code is ready.');

      // FINAL: COMPLETE
      await this.supabase.from('agent_jobs').update({
        status: 'completed',
        result: { reasoning, plan, code: finalCode, visualAnalysis }
      }).eq('id', jobId);

    } catch (err: any) {
      await this.logEvent(jobId, 'system', 'error', err.message);
      await this.supabase.from('agent_jobs').update({ status: 'failed', error: err.message }).eq('id', jobId);
    }
  }

  private async callGeminiVision(imageUrl: string, prompt: string) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.googleAIKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `Analyze this screenshot and describe the UI layout, colors, and components in detail. Use this to help build the app described: ${prompt}` },
              { inline_data: { mime_type: "image/png", data: imageUrl.split(',')[1] } }
            ]
          }]
        })
      });
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Vision analysis returned empty result.';
    } catch (e: any) {
      console.error('Gemini Vision Error:', e);
      throw new Error(`Vision Analysis Failed: ${e.message}`);
    }
  }

  private async callGroq(model: string, messages: any[]) {
    try {
      const response = await this.groq.chat.completions.create({ model, messages });
      return response.choices[0]?.message?.content || '';
    } catch (e) {
      throw e;
    }
  }

  private async logEvent(jobId: string, agentName: string, eventType: string, content: string) {
    await this.supabase.from('agent_events').insert({
      job_id: jobId,
      agent_name: agentName,
      event_type: eventType,
      content,
    });
  }

  async transcribe(file: File | Blob) {
    try {
      const transcription = await this.groq.audio.transcriptions.create({
        file: file as any,
        model: 'whisper-large-v3-turbo',
        response_format: 'verbose_json',
      });
      return transcription.text;
    } catch (e: any) {
      console.error('Transcription Error:', e);
      throw new Error(`Voice Synthesis Failed: ${e.message}`);
    }
  }

  /**
   * One-Click Deployment to Vercel
   * Creates a Vercel deployment from the generated files JSON.
   */
  async deployToVercel(files: { path: string, content: string }[], projectName: string) {
    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID; // Optional

    if (!VERCEL_TOKEN) throw new Error("VERCEL_TOKEN is not configured.");

    const deploymentFiles = files.map(f => ({
      file: f.path,
      data: f.content,
    }));

    try {
      const response = await fetch('https://api.vercel.com/v13/deployments' + (VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          files: deploymentFiles,
          projectSettings: {
            framework: "nextjs",
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Vercel Deployment Failed");

      return {
        url: data.url,
        deploymentId: data.id,
      };
    } catch (e: any) {
      console.error('Vercel API Error:', e);
      throw e;
    }
  }
}

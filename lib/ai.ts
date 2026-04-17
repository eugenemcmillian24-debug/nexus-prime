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

const DEVOPS_SYSTEM_PROMPT = `
You are the NEXUS PRIME DevOps Agent. Your specialty is diagnosing and fixing build/deployment failures.
STACK: Next.js 14 (App Router), TypeScript, Vercel.

INPUT:
1. BUILD LOG / ERROR MESSAGE: The exact error from the deployment platform.
2. CURRENT FILES: The relevant project files that might be causing the issue.

TASK:
1. ANALYZE the error log to find the specific file and line number (if available).
2. IDENTIFY the root cause (e.g., Type error, missing import, incorrect prop assignment, environment variable mismatch).
3. PROVIDE THE FIX: Return ONLY a JSON object containing the corrected versions of the affected files.

STRUCTURE:
{
  "analysis": "Brief explanation of what was wrong and how you fixed it.",
  "files": [
    { "path": "string", "content": "string" }
  ]
}

OUTPUT: Return ONLY the raw JSON string. No conversational filler.
`.trim();

const FIGMA_SYSTEM_PROMPT = `
You are the NEXUS PRIME Figma-to-Code Agent. You translate Figma JSON nodes into high-fidelity React components.
STACK: Next.js 14, TypeScript, Tailwind CSS, Lucide React.

INPUT: A JSON representation of a Figma node (component, frame, or group).

TASK:
1. ANALYZE the node's properties: dimensions, colors (fills), strokes, effects (shadows), and layout (Flex/Auto-layout).
2. MAP Figma properties to Tailwind CSS classes accurately.
3. GENERATE a clean React component using TypeScript.
4. OUTPUT: Return ONLY a JSON object with the component files.

STRUCTURE:
{
  "files": [
    { "path": "string", "content": "string" }
  ]
}

RULES:
- Handle Auto-layout as Flexbox.
- Convert absolute positioning where necessary.
- Extract text styles into Tailwind font classes.
- Export components as default.
`.trim();

const ARCHITECT_SYSTEM_PROMPT = `
You are the NEXUS PRIME Architect Agent. Your goal is to design the high-level system architecture, database schema, and API routing.
You focus on scalability, maintainability, and clean code principles.
When debating, provide concrete technical reasons for your decisions.
`.trim();

const UI_DESIGNER_SYSTEM_PROMPT = `
You are the NEXUS PRIME UI/UX Designer Agent. Your goal is to ensure the user interface is beautiful, accessible, and follows modern design tokens.
You focus on Tailwind CSS, animations, and user flow.
When debating, advocate for the best user experience and visual consistency.
`.trim();

const SECURITY_ANALYST_PROMPT = `
You are the NEXUS PRIME Security Analyst Agent. Your goal is to identify potential vulnerabilities and ensure data protection.
You focus on authentication, authorization (RBAC), and sanitization.
When debating, highlight risks like SQL injection, XSS, or broken access control.
`.trim();

const DB_ARCHITECT_SYSTEM_PROMPT = `
You are the NEXUS PRIME Database Architect Agent. Your goal is to design robust PostgreSQL schemas and generate Next.js Server Actions for data operations.
STACK: Supabase (PostgreSQL), Next.js 14 Server Actions, TypeScript.

TASK:
1. DESIGN a normalized database schema based on the user requirement.
2. GENERATE valid SQL migrations (CREATE TABLE, ALTER TABLE, etc.).
3. INCLUDE Row Level Security (RLS) policies by default.
4. GENERATE TypeScript interfaces for the database types.
5. GENERATE Next.js Server Actions for CRUD operations using the Supabase server client.

OUTPUT: Return ONLY a JSON object with the following structure:
{
  "analysis": "Brief explanation of the schema design.",
  "sql": "Raw SQL migration string.",
  "files": [
    { "path": "string", "content": "string" }
  ]
}

RULES:
- Use UUID for primary keys.
- Always include created_at and updated_at timestamps.
- Use snake_case for table and column names.
- Ensure SQL is idempotent (use IF NOT EXISTS).
`.trim();

const DOCUMENTATION_SYSTEM_PROMPT = `
You are the NEXUS PRIME Documentation Agent. Your goal is to generate professional, comprehensive documentation for a project.
STACK: Markdown, OpenAPI/Swagger.

TASK:
1. ANALYZE the project files and structure.
2. GENERATE a detailed README.md including:
   - Project Title & Description.
   - Installation & Setup instructions.
   - Core Features list.
   - Usage examples.
3. GENERATE API Documentation for Server Actions or API routes.
4. GENERATE Component Documentation (Component Lab) for UI components, including prop definitions and usage.

OUTPUT: Return ONLY a JSON object with the following structure:
{
  "files": [
    { "path": "string", "content": "string" }
  ],
  "components": [
    { "name": "string", "description": "string", "props": "string", "usage": "string" }
  ]
}

RULES:
- Use clear, technical English.
- Use Markdown formatting for files.
- Put API docs in 'docs/API.md'.
`.trim();

const VOICE_EDITOR_SYSTEM_PROMPT = `
You are the NEXUS PRIME Voice Editor Agent. Your specialty is applying targeted, real-time code modifications based on short voice commands.
STACK: Next.js 14, Tailwind CSS, TypeScript.

INPUT:
1. CURRENT FILE CONTENT: The code of the file the user is currently looking at.
2. VOICE COMMAND: The transcribed text of the user's spoken instruction (e.g., "Make the header red" or "Add a primary button under the title").

TASK:
1. INTERPRET the user's intent. Map informal language to technical implementations.
2. MODIFY the provided code to reflect the change.
3. OUTPUT: Return ONLY the modified file content as a raw string.

RULES:
- Maintain the exact same formatting, indentation, and structure of the original file.
- Change ONLY what was requested.
- Do NOT include conversational filler, explanations, or markdown code blocks.
- If the command is ambiguous, choose the most logical UI implementation.
`.trim();

const SHIELD_MODE_SYSTEM_PROMPT = `
You are the NEXUS PRIME Security Analyst (Shield-Mode). Your goal is to identify security vulnerabilities, compliance issues, and best practice violations in the provided codebase.

AUDIT SCOPE:
1. EXPOSED SECRETS: Hardcoded API keys, tokens, or passwords.
2. INSECURE HEADERS: Missing or weak security headers in API routes.
3. SQL INJECTION: Unsafe query building in Supabase/SQL calls.
4. XSS/CSRF: Improper sanitization or missing protection.
5. AUTHENTICATION: Weak session checks or improper middleware usage.
6. COMPLIANCE: GDPR/CCPA data handling best practices.

OUTPUT FORMAT:
Return a JSON array of vulnerability objects:
[
  {
    "id": "string",
    "severity": "critical" | "high" | "medium" | "low",
    "title": "string",
    "description": "string",
    "file": "string",
    "line": number,
    "recommendation": "string"
  }
]
Return ONLY the JSON array. No conversational filler.
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
        const jsonString = jsonMatch ? jsonMatch[0] : coderResponse;
        initialCode = JSON.parse(jsonString);
        if (!initialCode?.files || !Array.isArray(initialCode.files)) {
          throw new Error('Invalid JSON structure');
        }
      } catch (e) {
        initialCode = { files: [{ path: "app/page.tsx", content: coderResponse.replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*/g, '').replace(/```/g, '')).trim() }] };
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
        const jsonString = jsonMatch ? jsonMatch[0] : linterResponse;
        finalCode = JSON.parse(jsonString);
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

      // Point 3: Auto-sync AI-generated code into project files
      if (job.project_id && finalCode?.files) {
        for (const file of finalCode.files) {
          const ext = file.path.split(".").pop()?.toLowerCase();
          const langMap: Record<string, string> = {
            ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
            css: "css", scss: "scss", html: "html", json: "json", md: "markdown", sql: "sql",
          };
          const language = langMap[ext || ""] || "plaintext";

          await this.supabase.from('project_files').upsert({
            project_id: job.project_id,
            path: file.path,
            content: file.content,
            language,
            size_bytes: Buffer.from(file.content || "").length,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'project_id,path' });
        }
      }

    } catch (err: any) {
      await this.logEvent(jobId, 'system', 'error', err.message);
      await this.supabase.from('agent_jobs').update({ status: 'failed', error: err.message }).eq('id', jobId);
    }
  }

  private async callGeminiVision(imageUrl: string, prompt: string) {
    if (!this.googleAIKey || this.googleAIKey === 'undefined') {
      throw new Error('Google AI Key is missing. Vision features are disabled.');
    }
    try {
      // Defensive check for image data format
      if (!imageUrl || (!imageUrl.startsWith('data:image/') && imageUrl.length < 50)) {
        throw new Error('Invalid image format. Expected a base64 data URL.');
      }

      const base64Data = imageUrl.includes(',') ? imageUrl.split(',')[1] : imageUrl;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.googleAIKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `Analyze this screenshot and describe the UI layout, colors, and components in detail. Use this to help build the app described: ${prompt}` },
              { inline_data: { mime_type: "image/png", data: base64Data } }
            ]
          }]
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'Gemini Vision API Error');
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
    // ... existing transcribe ...
  }

  /**
   * Shield-Mode: Perform Security Audit
   */
  async performSecurityAudit(files: { path: string, content: string }[]) {
    const auditResponse = await this.callGroq('llama-3.3-70b-versatile', [
      { role: 'system', content: SHIELD_MODE_SYSTEM_PROMPT },
      { role: 'user', content: `Audit the following project files:\n${JSON.stringify(files)}` }
    ]);

    try {
      const jsonMatch = auditResponse.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : auditResponse);
    } catch (e) {
      console.error('Audit Parse Error:', e);
      return [];
    }
  }

  /**
   * Shield-Mode: Fix Security Vulnerability
   */
  async fixSecurityVulnerability(file: { path: string, content: string }, vulnerability: any) {
    const fixResponse = await this.callGroq('llama-3.3-70b-versatile', [
      { role: 'system', content: 'You are the NEXUS PRIME Security Fixer. Apply the recommended fix to the provided code while maintaining functionality.' },
      { role: 'user', content: `File: ${file.path}\nContent: ${file.content}\nVulnerability: ${vulnerability.title}\nRecommendation: ${vulnerability.recommendation}\n\nReturn the ENTIRE updated file content only. No markdown.` }
    ]);

    return fixResponse.trim();
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

  /**
   * Heal a failed deployment using AI analysis
   */
  async healDeployment(deploymentId: string) {
    // 1. Fetch deployment details
    const { data: deploy, error: deployError } = await this.supabase
      .from('deployments')
      .select('*')
      .eq('id', deploymentId)
      .single();

    if (deployError || !deploy) throw new Error("Deployment not found");
    if (deploy.status !== 'failed') throw new Error("Only failed deployments can be healed.");

    // 2. Fetch project files
    const { data: files } = await this.supabase
      .from('project_files')
      .select('path, content')
      .eq('project_id', deploy.project_id);

    if (!files || files.length === 0) throw new Error("No files found for this project.");

    // 3. Call DevOps Agent
    const errorLog = deploy.build_log || deploy.error_message || "Unknown build error";
    
    // We only send the relevant error context and files to save tokens
    // In a real scenario, we might filter files based on the error log mentions
    const prompt = `
Build Log:
${errorLog}

Current Files:
${JSON.stringify(files.slice(0, 20))} // Limiting for context window safety
    `;

    const response = await this.callGroq('llama-3.3-70b-versatile', [
      { role: 'system', content: DEVOPS_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : response;
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse DevOps Agent response:", response);
      throw new Error("AI failed to produce a structured fix. Please check the logs manually.");
    }
  }

  /**
   * Import Figma nodes and convert them to React components
   */
  async importFromFigma(figmaData: any) {
    // Process multiple nodes if provided
    const nodes = Array.isArray(figmaData.nodes) ? figmaData.nodes : [figmaData.node];
    const results = [];

    for (const node of nodes) {
      const response = await this.callGroq('llama-3.3-70b-versatile', [
        { role: 'system', content: FIGMA_SYSTEM_PROMPT },
        { role: 'user', content: `Figma Node Data: ${JSON.stringify(node)}` }
      ]);

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : response;
        const result = JSON.parse(jsonString);
        results.push(...result.files);
      } catch (e) {
        console.error("Figma conversion failed for node:", node.name, e);
      }
    }

    return { files: results };
  }

  /**
   * War Room Multi-Agent Debate
   */
  async conductWarRoomDebate(jobId: string, userPrompt: string) {
    const debate: any[] = [];

    // 1. Architect's Perspective
    await this.logEvent(jobId, 'Architect', 'thought', 'Designing system architecture...');
    const architectResponse = await this.callGroq('llama-3.3-70b-versatile', [
      { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
      { role: 'user', content: `Design a high-level architecture for this request: ${userPrompt}` }
    ]);
    debate.push({ agent: 'Architect', content: architectResponse });
    await this.logEvent(jobId, 'Architect', 'completion', architectResponse);

    // 2. UI/UX Designer's Perspective (Contextualized)
    await this.logEvent(jobId, 'UI/UX Designer', 'thought', 'Refining user interface and flow...');
    const uiDesignerResponse = await this.callGroq('llama-3.3-70b-versatile', [
      { role: 'system', content: UI_DESIGNER_SYSTEM_PROMPT },
      { role: 'user', content: `User Request: ${userPrompt}\n\nArchitect's Proposal: ${architectResponse}\n\nHow should we design the UI to match this architecture?` }
    ]);
    debate.push({ agent: 'UI/UX Designer', content: uiDesignerResponse });
    await this.logEvent(jobId, 'UI/UX Designer', 'completion', uiDesignerResponse);

    // 3. Security Analyst's Perspective
    await this.logEvent(jobId, 'Security Analyst', 'thought', 'Auditing the proposal for vulnerabilities...');
    const securityResponse = await this.callGroq('llama-3.3-70b-versatile', [
      { role: 'system', content: SECURITY_ANALYST_PROMPT },
      { role: 'user', content: `User Request: ${userPrompt}\n\nArchitect's Proposal: ${architectResponse}\n\nUI Proposal: ${uiDesignerResponse}\n\nIdentify potential security risks.` }
    ]);
    debate.push({ agent: 'Security Analyst', content: securityResponse });
    await this.logEvent(jobId, 'Security Analyst', 'completion', securityResponse);

    return debate;
  }

  /**
   * Full-Stack Database Architecture Generation
   */
  async generateDatabaseSchema(jobId: string, userPrompt: string) {
    await this.logEvent(jobId, 'Database Architect', 'thought', 'Designing database schema and CRUD actions...');
    const response = await this.callGroq('llama-3.3-70b-versatile', [
      { role: 'system', content: DB_ARCHITECT_SYSTEM_PROMPT },
      { role: 'user', content: `Requirement: ${userPrompt}` }
    ]);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : response;
      const result = JSON.parse(jsonString);
      
      await this.logEvent(jobId, 'Database Architect', 'completion', `Generated schema with ${result.files?.length || 0} files.`);
      return result;
    } catch (e) {
      console.error("Database Architect parsing failed:", response);
      throw new Error("AI failed to produce a structured database design.");
    }
  }

  /**
   * Generate project documentation and component lab data
   */
  async generateDocumentation(jobId: string, projectId: string) {
    // 1. Fetch project files
    const { data: files } = await this.supabase
      .from('project_files')
      .select('path, content')
      .eq('project_id', projectId);

    if (!files || files.length === 0) throw new Error("No files found for documentation.");

    await this.logEvent(jobId, 'Documentation Agent', 'thought', 'Analyzing project structure for documentation...');
    
    // We send a summary of files and some sample content to save tokens
    const fileSummary = files.map((f: any) => f.path).join('\n');
    const sampleContent = files.slice(0, 15).map((f: any) => `FILE: ${f.path}\n${f.content.slice(0, 2000)}`).join('\n---\n');

    const response = await this.callGroq('llama-3.3-70b-versatile', [
      { role: 'system', content: DOCUMENTATION_SYSTEM_PROMPT },
      { role: 'user', content: `Project Structure:\n${fileSummary}\n\nSample Content:\n${sampleContent}` }
    ]);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : response;
      const result = JSON.parse(jsonString);
      
      await this.logEvent(jobId, 'Documentation Agent', 'completion', `Generated ${result.files?.length || 0} docs and ${result.components?.length || 0} component specs.`);
      return result;
    } catch (e) {
      console.error("Documentation Agent parsing failed:", response);
      throw new Error("AI failed to produce structured documentation.");
    }
  }

  /**
   * Apply a voice-driven code edit to a specific file
   */
  async applyVoiceEdit(jobId: string, fileContent: string, voiceCommand: string) {
    await this.logEvent(jobId, 'Voice Editor', 'thought', `Interpreting voice command: "${voiceCommand}"`);
    
    const response = await this.callGroq('llama-3.3-70b-versatile', [
      { role: 'system', content: VOICE_EDITOR_SYSTEM_PROMPT },
      { role: 'user', content: `Current File Code:\n${fileContent}\n\nVoice Command: "${voiceCommand}"` }
    ]);

    // Clean markdown blocks if LLM disobeyed
    const cleanedCode = response.replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*/g, '').replace(/```/g, '')).trim();
    
    await this.logEvent(jobId, 'Voice Editor', 'completion', `Modified ${cleanedCode.length} characters of code.`);
    return cleanedCode;
  }
}

import { Groq } from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { TIER_LIMITS } from './nexus_prime_constants';

// ─── FREE-FIRST FALLBACK CHAIN ───────────────────────────────────────────────
// Primary AI completion path: cycles through free/cheap providers before
// falling back to the class-level Groq SDK instance.

// Provider shape: OpenAI-compat providers use POST <url> with `{model, messages, ...}`.
// The `google` provider needs the native generateContent shape (key in query string,
// `contents:[{parts:[{text}]}]` body) so we set `shape: "google"` on it and branch in
// aiComplete/aiCompleteStream. Every other provider is standard OpenAI-compat.
type ProviderShape = "openai" | "google";

interface Provider {
  name: string;
  url: string;
  key: string;
  models: string[];
  shape?: ProviderShape;
}

const FALLBACK_PROVIDERS: Provider[] = [
  {
    // OpenCode Zen — free-tier curated models (OpenAI-compatible). All five slugs
    // below are marked `Free` in https://opencode.ai/docs/zen#pricing. Listed most-
    // likely-to-be-available first so transient capacity issues fall through quickly.
    url: "https://opencode.ai/zen/v1/chat/completions",
    key: process.env.OPENCODE_ZEN_API_KEY!,
    models: [
      "minimax-m2.5-free",
      "nemotron-3-super-free",
      "hy3-preview-free",
      "big-pickle",
      "ling-2.6-flash",
    ],
    name: "zen-free",
  },
  {
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: process.env.GROQ_API_KEY!,
    // Verified against https://api.groq.com/openai/v1/models on 2026-04-23.
    // llama-3.1-70b-versatile was retired; use llama-3.3-70b-versatile.
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen/qwen3-32b"],
    name: "groq",
  },
  {
    url: "https://openrouter.ai/api/v1/chat/completions",
    key: process.env.OPENROUTER_API_KEY!,
    // Verified against https://openrouter.ai/api/v1/models on 2026-04-23.
    // google/gemini-flash-1.5 was removed — replaced with gemini-2.0-flash-001.
    // claude-3-5-haiku is the current active slug (3.5-sonnet retired; use
    // claude-sonnet-4.5 if a stronger coder-tier fallback is needed).
    models: [
      "google/gemini-2.0-flash-001",
      "anthropic/claude-3-5-haiku",
      "anthropic/claude-sonnet-4.5",
    ],
    name: "openrouter",
  },
  {
    // Google native generateContent API. Requires shape:"google" branch below.
    // GOOGLE_AI_KEY is the canonical env var used by every other route in
    // this repo; GEMINI_API_KEY kept as a legacy fallback.
    url: "https://generativelanguage.googleapis.com/v1beta/models",
    key: (process.env.GOOGLE_AI_KEY ?? process.env.GEMINI_API_KEY)!,
    // Verified via v1beta/models ListModels on 2026-04-23. gemini-1.5-flash was
    // removed from v1beta; gemini-flash-latest always resolves to the current
    // recommended flash tier, gemini-2.5-flash is a stable fallback.
    models: ["gemini-flash-latest", "gemini-2.5-flash"],
    name: "gemini",
    shape: "google",
  },
];

// Translate OpenAI-style messages into the Google generateContent `contents` shape.
function toGoogleContents(messages: { role: string; content: string }[]) {
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const convo = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const body: Record<string, unknown> = { contents: convo };
  if (systemText) body.systemInstruction = { parts: [{ text: systemText }] };
  return body;
}

interface AIOptions {
  temperature?: number
  max_tokens?: number
}

export async function aiComplete(
  messages: { role: string; content: string }[],
  options?: AIOptions
): Promise<string> {
  for (const provider of FALLBACK_PROVIDERS) {
    if (!provider.key) continue

    for (const model of provider.models) {
      try {
        const isGoogle = provider.shape === "google";
        const url = isGoogle
          ? `${provider.url}/${model}:generateContent?key=${provider.key}`
          : provider.url;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (!isGoogle) headers["Authorization"] = `Bearer ${provider.key}`;
        const body = isGoogle
          ? {
              ...toGoogleContents(messages),
              generationConfig: {
                temperature: options?.temperature ?? 0.7,
                maxOutputTokens: options?.max_tokens ?? 2048,
              },
            }
          : {
              model,
              messages,
              temperature: options?.temperature ?? 0.7,
              max_tokens: options?.max_tokens ?? 2048,
            };

        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        })

        if (!res.ok) {
          console.warn(`[${provider.name}/${model}] failed: ${res.status}`)
          continue
        }

        const data = await res.json()
        const content = isGoogle
          ? data.candidates?.[0]?.content?.parts?.[0]?.text
          : data.choices?.[0]?.message?.content;
        if (!content) continue;
        return content as string;
      } catch (err) {
        console.warn(`[${provider.name}/${model}] error:`, err)
        continue
      }
    }
  }

  throw new Error("All AI providers failed")
}

export async function aiCompleteStream(
  messages: { role: string; content: string }[],
  options?: AIOptions
): Promise<ReadableStream> {
  for (const provider of FALLBACK_PROVIDERS) {
    if (!provider.key) continue
    // The Google provider streams via a different protocol (SSE on
    // :streamGenerateContent). Since all existing callers expect an
    // OpenAI-compat SSE body, skip Google here and fall through to the
    // OpenAI-compat providers for streaming only.
    if (provider.shape === "google") continue

    for (const model of provider.models) {
      try {
        const res = await fetch(provider.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${provider.key}`
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.max_tokens ?? 2048,
            stream: true
          }),
          signal: AbortSignal.timeout(15000)
        })

        if (!res.ok) continue
        if (!res.body) continue

        return res.body
      } catch (err) {
        console.warn(`[${provider.name}/${model}] stream error:`, err)
        continue
      }
    }
  }

  throw new Error("All AI providers failed")
}

// ─── AGENT CONFIG & PROMPTS ──────────────────────────────────────────────────

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

const TESTER_SYSTEM_PROMPT = `
You are the NEXUS PRIME Tester Agent. You generate focused Vitest unit tests for the code the Coder just produced.
STACK: Vitest, @testing-library/react (for components), @testing-library/jest-dom.

INPUTS:
1. The full set of source files (path + content).
2. The original build plan.

RULES:
1. GENERATE ONE TEST FILE per testable source file. Testable = exports any function, hook, class, util, or React component. SKIP pure style/layout files (e.g. app/globals.css, tailwind.config.*), config files, and pages whose behavior is entirely JSX layout with no interactivity.
2. TEST PATHS: place every test next to its source under __tests__/ or as .test.ts(x). Example: 'lib/math.ts' -> '__tests__/lib/math.test.ts'. 'components/Counter.tsx' -> '__tests__/components/Counter.test.tsx'.
3. FOCUS: one happy-path test and one meaningful edge case per exported symbol. Do NOT write trivial "renders without crashing" assertions.
4. IMPORT USING PATH ALIAS if the codebase uses one; otherwise use relative paths from the test file.
5. DO NOT MOCK EVERYTHING — only mock external side-effects (fetch, file system, DB). Pure functions should be called directly.
6. USE @testing-library/react for component tests with 'render', 'screen', 'fireEvent'. Assert on visible output / role / text, not internal state.
7. STRUCTURE: Return ONLY a raw JSON object with the generated test files:
   { "tests": [ { "path": "string", "content": "string" } ] }
   - If nothing is testable in the provided files, return { "tests": [] }.
8. OUTPUT: Return ONLY the JSON. No prose, no markdown fences.
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
    { "name": "string", "path": "string", "description": "string", "props": "string", "usage": "string" }
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
You are the NEXUS PRIME Security Shield Agent. Your goal is to identify security vulnerabilities in the provided code.
STACK: Next.js 14, TypeScript, Supabase, Tailwind.

TASK:
1. AUDIT the provided files for OWASP Top 10 vulnerabilities (XSS, SQLi, CSRF, etc.).
2. IDENTIFY insecure API routes, missing authentication checks, or exposed secrets.
3. PROVIDE a structured report.

OUTPUT FORMAT:
Return ONLY a JSON array of vulnerability objects:
[
  {
    "id": "uuid",
    "severity": "critical" | "high" | "medium" | "low",
    "title": "Short descriptive title",
    "description": "Detailed explanation of the risk",
    "file": "path/to/file",
    "line": number,
    "recommendation": "How to fix this issue"
  }
]
`.trim();

const TEST_GENERATOR_SYSTEM_PROMPT = `
You are the NEXUS PRIME Test Architect. Your goal is to generate comprehensive unit and integration tests for the provided code.
STACK: Vitest, React Testing Library, Playwright.

TASK:
1. ANALYZE the logic and edge cases of the provided files.
2. GENERATE valid TypeScript test files.
3. ENSURE tests cover primary user flows and error states.

OUTPUT FORMAT:
Return ONLY a JSON object:
{
  "files": [
    { "path": "path/to/test.test.tsx", "content": "string" }
  ]
}
`.trim();

const PERFORMANCE_AGENT_SYSTEM_PROMPT = `
You are the NEXUS PRIME Performance Optimization Agent. Your goal is to identify bottlenecks and suggest optimizations.
STACK: Next.js 14, React Server Components, Tailwind.

TASK:
1. ANALYZE component rendering, bundle size potential, and data fetching strategies.
2. IDENTIFY unnecessary re-renders, missing 'use memo', or opportunities for Server Components.
3. PROVIDE actionable optimizations.

OUTPUT FORMAT:
Return ONLY a JSON array of optimization objects:
[
  {
    "type": "performance",
    "message": "Description of the bottleneck",
    "file": "path/to/file",
    "suggestion": "Specific code fix or architectural change"
  }
]
`.trim();

const MARKETING_PSY_SYSTEM_PROMPT = `
You are the NEXUS PRIME Marketing Psychology Agent. Your goal is to optimize the UI for conversion, engagement, and user retention.
Use principles like:
1. SCARCITY & URGENCY: Implement countdowns, limited stock indicators, or exclusive offer badges.
2. SOCIAL PROOF: Add testimonials, user count badges, or "trusted by" logos.
3. COGNITIVE EASE: Ensure clear call-to-actions (CTAs), minimal friction in forms, and intuitive navigation.
4. VISUAL HIERARCHY: Use size, color, and contrast to guide the user's eye to primary actions.
5. LOSS AVERSION: Frame offers in terms of what the user might lose if they don't act.

STACK: Next.js 14, Tailwind CSS, TypeScript.
OUTPUT: Return ONLY a JSON object with the optimized files.
`.trim();

const SECURITY_GURU_SYSTEM_PROMPT = `
You are the NEXUS PRIME Security Guru. Your goal is to perform deep penetration testing and security hardening on the generated code.
Focus on:
1. OWASP TOP 10: Mitigate XSS, SQL Injection, CSRF, and Broken Access Control.
2. DATA SANITIZATION: Ensure all user inputs are properly validated and sanitized.
3. SECURE HEADERS: Implement CSP, HSTS, and X-Frame-Options.
4. RBAC: Ensure strict Role-Based Access Control on all server actions and API routes.
5. SECURE STORAGE: Use HttpOnly cookies and encrypted storage for sensitive data.

STACK: Next.js 14, Supabase, TypeScript.
OUTPUT: Return ONLY a JSON object with the secured files.
`.trim();

const SEO_ARCHITECT_SYSTEM_PROMPT = `
You are the NEXUS PRIME SEO Architect. Your goal is to ensure the application ranks at the top of search results.
Focus on:
1. METADATA: Generate dynamic title tags, meta descriptions, and OpenGraph tags for every page.
2. SCHEMA.ORG: Implement JSON-LD structured data (Product, Organization, Article, Breadcrumb).
3. SEMANTIC HTML: Use proper heading structures (H1-H6) and alt text for all images.
4. CORE WEB VITALS: Optimize for LCP, FID, and CLS.
5. SITEMAP & ROBOTS: Generate sitemap.xml and robots.txt.

STACK: Next.js 14, TypeScript.
OUTPUT: Return ONLY a JSON object with the SEO-optimized files.
`.trim();

const COMPONENT_PARSER_SYSTEM_PROMPT = `
You are the NEXUS PRIME Component Architect. Your goal is to extract the interface/props and a default configuration for a given React component.

TASK:
1. ANALYZE the provided React component code.
2. EXTRACT all props, their types, and whether they are optional.
3. GENERATE a JSON object representing the prop schema and a default value for each prop.

OUTPUT FORMAT:
{
  "props": [
    { "name": "string", "type": "string", "optional": boolean, "defaultValue": any, "options": string[] (if enum) }
  ]
}
Return ONLY the raw JSON object. No conversational filler.
`.trim();

const DEPLOYMENT_MONITOR_SYSTEM_PROMPT = `
You are the NEXUS PRIME Deployment Command Center Agent. Your goal is to analyze deployment logs and production health metrics.

TASK:
1. ANALYZE provided logs from Vercel/Netlify.
2. IDENTIFY performance bottlenecks, runtime errors, or build warnings.
3. PROVIDE actionable recommendations for optimization or fixing.

OUTPUT FORMAT:
{
  "status": "healthy" | "warning" | "error",
  "summary": "Short summary of the health state.",
  "issues": [
    { "type": "error" | "warning" | "performance", "message": "Description", "file": "path/to/file", "suggestion": "How to fix" }
  ],
  "metrics": {
    "buildTime": "string",
    "bundleSize": "string",
    "errorRate": "string"
  }
}
Return ONLY the raw JSON object. No conversational filler.
`.trim();

// ─── ORCHESTRATOR CLASS ──────────────────────────────────────────────────────

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
   * Primary AI completion: free-first fallback chain → Groq SDK last resort.
   * Replaces direct callGroq for all agent steps.
   */
  private async callAI(messages: { role: string; content: string }[], fallbackModel = 'llama-3.3-70b-versatile'): Promise<string> {
    try {
      return await aiComplete(messages);
    } catch {
      // All fetch-based providers failed — last resort: Groq SDK
      return this.callGroqSDK(fallbackModel, messages);
    }
  }

  /**
   * Last-resort Groq SDK call (kept as fallback only).
   */
  private async callGroqSDK(model: string, messages: any[]) {
    const response = await this.groq.chat.completions.create({ model, messages });
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Multi-Agent Execution Pipeline (Enhanced with Vision)
   * 1. Vision (Gemini 2.0 Flash) -> Visual Analysis (Optional)
   * 2. Reasoner (Qwen3-32B) -> Logic / Chain of Thought
   * 3. Orchestrator (Llama-70B) -> Plan / Tool Selection
   * 4. Coder (Llama-8B) -> Execution / Code Generation
   * 5. Linter (Llama-70B) -> Quality Assurance
   */
  async executeJob(jobId: string, options?: { isUnthrottled?: boolean }) {
    try {
      // Fetch the job itself. Split related lookups into separate queries to
      // avoid PostgREST embed ambiguity (user_credits.user_id and
      // agent_jobs.user_id both reference auth.users, so there is no direct
      // FK between the two public tables — embedding them can fail at runtime
      // and previously caused silent drops with `if (!job) return;`).
      const { data: job, error: jobErr } = await this.supabase
        .from('agent_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      if (jobErr) throw new Error(`Failed to load agent_job ${jobId}: ${jobErr.message}`);
      if (!job) throw new Error(`agent_job ${jobId} not found`);

      let customSystemPrompt = '';
      if (job.training_module_id) {
        const { data: mod, error: modErr } = await this.supabase
          .from('agent_training_modules')
          .select('system_prompt')
          .eq('id', job.training_module_id)
          .maybeSingle();
        if (modErr) throw new Error(`Failed to load agent_training_modules ${job.training_module_id}: ${modErr.message}`);
        customSystemPrompt = mod?.system_prompt || '';
      }

      const { data: creditsRow, error: creditsErr } = await this.supabase
        .from('user_credits')
        .select('agency_mode, agency_config, tier')
        .eq('user_id', job.user_id)
        .maybeSingle();
      if (creditsErr) throw new Error(`Failed to load user_credits for user ${job.user_id}: ${creditsErr.message}`);

      const isUnthrottled = options?.isUnthrottled || process.env.NEXUS_UNTHROTTLED_BUILD === 'true';
      const isAgencyMode = creditsRow?.agency_mode || false;
      const agencyConfig = creditsRow?.agency_config || {};
      const userTier = creditsRow?.tier || 'Free';
      const isPriority = (TIER_LIMITS as any)[userTier]?.priorityCompute || false;

      await this.supabase.from('agent_jobs').update({ status: 'running' }).eq('id', jobId);

      if (isUnthrottled) {
        await this.logEvent(jobId, 'system', 'status', 'UNTHROTTLED BUILD PIPELINE ACTIVE');
      }

      if (isAgencyMode) {
        await this.logEvent(jobId, 'system', 'status', 'AGENCY WHITE-LABEL MODE ACTIVE');
      }

      if (isPriority) {
        await this.logEvent(jobId, 'system', 'status', 'PRIORITY COMPUTE QUEUE ACTIVE (Faster Models)');
      }

      let visualAnalysis = '';
      
      // STEP 0: VISION ANALYSIS (Gemini 2.0 Flash)
      if (job.image_url) {
        await this.logEvent(jobId, 'gemini-2.0-flash', 'thought', 'Analyzing screenshot with Gemini Vision...');
        visualAnalysis = await this.callGeminiVision(job.image_url, job.prompt);
        await this.logEvent(jobId, 'gemini-2.0-flash', 'completion', visualAnalysis);
      }

      // STEP 1: REASONING (free-first chain, Groq SDK fallback)
      await this.logEvent(jobId, 'reasoner', 'thought', 'Initializing deep reasoning...');
      const reasoning = await this.callAI([
        { role: 'system', content: 'You are the Reasoner. Break down the user prompt and visual analysis into a logical architecture.' },
        { role: 'user', content: `Prompt: ${job.prompt}\nVisual Analysis: ${visualAnalysis}` }
      ], isPriority ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant');
      await this.logEvent(jobId, 'reasoner', 'completion', reasoning);

      // STEP 2: ORCHESTRATION
      await this.logEvent(jobId, 'orchestrator', 'thought', 'Generating execution plan based on reasoning...');
      const plan = await this.callAI([
        { role: 'system', content: 'You are the Orchestrator. Create a task list for the Coder agent.' },
        { role: 'user', content: `Reasoning: ${reasoning}\nPrompt: ${job.prompt}` }
      ]);
      await this.logEvent(jobId, 'orchestrator', 'completion', plan);

      // STEP 3: CODING - MULTI-FILE JSON
      await this.logEvent(jobId, 'coder', 'thought', 'Writing multi-file code structure...');
      
      let systemPrompt = CODER_SYSTEM_PROMPT;
      
      // Handle Premium Agents
      if (job.agent_type === 'marketing-psy') systemPrompt = `${CODER_SYSTEM_PROMPT}\n\n${MARKETING_PSY_SYSTEM_PROMPT}`;
      if (job.agent_type === 'security-guru') systemPrompt = `${CODER_SYSTEM_PROMPT}\n\n${SECURITY_GURU_SYSTEM_PROMPT}`;
      if (job.agent_type === 'seo-architect') systemPrompt = `${CODER_SYSTEM_PROMPT}\n\n${SEO_ARCHITECT_SYSTEM_PROMPT}`;
      
      // Apply Custom Training Module
      if (customSystemPrompt) {
        systemPrompt = `${systemPrompt}\n\nCUSTOM INSTRUCTIONS:\n${customSystemPrompt}`;
      }

      if (isAgencyMode) {
        const agencyName = agencyConfig.company_name || "Custom AI Solutions";
        systemPrompt = systemPrompt.replace(/NEXUS PRIME/g, agencyName).replace(/Nexus Prime/g, agencyName);
        
        let whiteLabelInstructions = `\n\nWHITE-LABEL RULE: Do NOT include any branding, comments, or references to "Nexus Prime" or "Skywork". Use the name "${agencyName}" if needed.`;
        
        if (agencyConfig.footer_html) {
          whiteLabelInstructions += `\nINJECT FOOTER: Always include this HTML footer at the bottom of the main layout/page: ${agencyConfig.footer_html}`;
        }
        
        if (agencyConfig.support_email) {
          whiteLabelInstructions += `\nSUPPORT CONTACT: Use "${agencyConfig.support_email}" for any contact/support links.`;
        }

        systemPrompt = `${systemPrompt}${whiteLabelInstructions}`;
      }

      const coderResponse = await this.callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Plan: ${plan}` }
      ], isPriority ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant');
      
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
      await this.logEvent(jobId, 'coder', 'completion', `Generated ${initialCode.files?.length || 1} files`);

      // STEP 4: LINTING - QUALITY ASSURANCE
      await this.logEvent(jobId, 'linter', 'thought', 'Reviewing code for syntax and type safety...');
      const linterResponse = await this.callAI([
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
        finalCode = initialCode;
      }
      await this.logEvent(jobId, 'linter', 'completion', 'Quality assurance complete. Code is ready.');

      // STEP 5: TESTING - GENERATE VITEST SUITES
      // Non-blocking: failure here never marks the whole build failed.
      // Tests are appended to finalCode.files so they ride the same
      // auto-sync path as source files. A follow-up PR will add an
      // executor that actually runs the generated tests.
      const testerFiles = await this.runTesterAgent(jobId, finalCode, plan);
      if (testerFiles.length > 0) {
        finalCode = {
          ...finalCode,
          files: [...(finalCode.files || []), ...testerFiles],
          tests: testerFiles,
        };
      }

      // FINAL: COMPLETE
      await this.supabase.from('agent_jobs').update({
        status: 'completed',
        result: { reasoning, plan, code: finalCode, visualAnalysis }
      }).eq('id', jobId);

      // Auto-sync AI-generated code into project files
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

  /**
   * Generate Vitest test files for the finalized code.
   *
   * Returns an array of test files ready to be merged into finalCode.files.
   * Any failure (upstream AI error, unparseable JSON, wrong shape) is
   * logged as a tester event but does NOT throw — we never want a test
   * generation hiccup to blow away a successful build.
   */
  private async runTesterAgent(
    jobId: string,
    code: { files?: { path: string; content: string }[] },
    plan: string,
  ): Promise<{ path: string; content: string }[]> {
    try {
      if (!code?.files || code.files.length === 0) {
        await this.logEvent(jobId, 'tester', 'thought', 'No source files to test. Skipping tester agent.');
        return [];
      }

      await this.logEvent(
        jobId,
        'tester',
        'thought',
        `Generating Vitest suites for ${code.files.length} source file(s)...`,
      );

      const testerResponse = await this.callAI([
        { role: 'system', content: TESTER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Plan: ${plan}\n\nSource Files:\n${JSON.stringify(code.files)}`,
        },
      ]);

      // Tester prompt returns { tests: [...] }. Be tolerant of prose
      // wrappers or fence blocks and fall back to the Coder-style
      // { files: [...] } shape if the model gets cute.
      let parsed: { tests?: unknown; files?: unknown } = {};
      try {
        const jsonMatch = testerResponse.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : testerResponse;
        parsed = JSON.parse(jsonString);
      } catch {
        await this.logEvent(
          jobId,
          'tester',
          'error',
          'Tester returned unparseable JSON. Tests skipped for this build.',
        );
        return [];
      }

      const rawTests = Array.isArray(parsed.tests)
        ? parsed.tests
        : Array.isArray(parsed.files)
          ? parsed.files
          : [];

      const tests = rawTests
        .filter(
          (t): t is { path: string; content: string } =>
            !!t &&
            typeof (t as { path?: unknown }).path === 'string' &&
            typeof (t as { content?: unknown }).content === 'string',
        )
        .filter((t) => t.content.trim().length > 0)
        .map((t) => ({
          path: t.path.startsWith('__tests__/') || /\.(test|spec)\.[tj]sx?$/.test(t.path)
            ? t.path
            : // Normalize anything the model returned that doesn't look
              // like a test path — put it under __tests__/ next to its
              // original directory to keep the project tree tidy.
              `__tests__/${t.path.replace(/\.(tsx?|jsx?)$/, '.test.$1')}`,
          content: t.content,
        }));

      await this.logEvent(
        jobId,
        'tester',
        'completion',
        tests.length === 0
          ? 'Tester agent found nothing testable in this build.'
          : `Generated ${tests.length} test file(s): ${tests.map((t) => t.path).join(', ')}`,
      );

      return tests;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.logEvent(jobId, 'tester', 'error', `Tester agent failed: ${message}`);
      return [];
    }
  }

  private async callGeminiVision(imageUrl: string, prompt: string) {
    if (!this.googleAIKey || this.googleAIKey === 'undefined') {
      throw new Error('Google AI Key is missing. Vision features are disabled.');
    }
    try {
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
      throw new Error(`Vision Analysis Failed: ${e.message}`);
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
    const auditResponse = await this.callAI([
      { role: 'system', content: SHIELD_MODE_SYSTEM_PROMPT },
      { role: 'user', content: `Audit the following project files:\n${JSON.stringify(files)}` }
    ]);

    try {
      const jsonMatch = auditResponse.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : auditResponse);
    } catch (e) {
      return [];
    }
  }

  /**
   * Shield-Mode: Fix Security Vulnerability
   */
  async fixSecurityVulnerability(file: { path: string, content: string }, vulnerability: any) {
    const fixResponse = await this.callAI([
      { role: 'system', content: 'You are the NEXUS PRIME Security Fixer. Apply the recommended fix to the provided code while maintaining functionality.' },
      { role: 'user', content: `File: ${file.path}\nContent: ${file.content}\nVulnerability: ${vulnerability.title}\nRecommendation: ${vulnerability.recommendation}\n\nReturn the ENTIRE updated file content only. No markdown.` }
    ]);

    return fixResponse.trim();
  }

  /**
   * AI Test Generation
   */
  async generateTests(files: { path: string, content: string }[]) {
    const response = await this.callAI([
      { role: 'system', content: TEST_GENERATOR_SYSTEM_PROMPT },
      { role: 'user', content: `Generate tests for these files:\n${JSON.stringify(files)}` }
    ]);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const data = JSON.parse(jsonMatch ? jsonMatch[0] : response);
      return data.files || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * AI Performance Analysis
   */
  async analyzePerformance(files: { path: string, content: string }[]) {
    // ... existing analyzePerformance ...
  }

  /**
   * AI Deployment Health Analysis
   */
  async analyzeDeploymentHealth(logs: string) {
    const response = await this.callAI([
      { role: 'system', content: DEPLOYMENT_MONITOR_SYSTEM_PROMPT },
      { role: 'user', content: `Analyze these deployment logs:\n${logs}` }
    ]);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
      return { status: 'error', summary: 'Failed to analyze logs.' };
    }
  }

  /**
   * AI Component Prop Parsing
   */
  async parseComponentProps(fileContent: string) {
    const response = await this.callAI([
      { role: 'system', content: COMPONENT_PARSER_SYSTEM_PROMPT },
      { role: 'user', content: `Extract props from this component:\n${fileContent}` }
    ]);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
      return { props: [] };
    }
  }

  /**
   * One-Click Deployment to Vercel
   */
  async deployToVercel(files: { path: string, content: string }[], projectName: string) {
    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

    if (!VERCEL_TOKEN) throw new Error("VERCEL_TOKEN is not configured.");

    const deploymentFiles = files.map(f => ({
      file: f.path,
      data: f.content,
    }));

    if (!files.some(f => f.path === 'package.json')) {
      deploymentFiles.push({
        file: 'package.json',
        data: JSON.stringify({
          name: projectName,
          version: "0.1.0",
          private: true,
          dependencies: {
            "next": "14.2.35",
            "react": "^18",
            "react-dom": "^18",
            "lucide-react": "^0.378.0",
            "tailwind-merge": "^2.3.0",
            "clsx": "^2.1.1"
          },
          devDependencies: {
            "typescript": "^5",
            "@types/node": "^20",
            "@types/react": "^18",
            "@types/react-dom": "^18",
            "postcss": "^8",
            "tailwindcss": "^3.4.1"
          }
        }, null, 2)
      });
    }

    if (!files.some(f => f.path === 'tsconfig.json')) {
      deploymentFiles.push({
        file: 'tsconfig.json',
        data: JSON.stringify({
          compilerOptions: {
            target: "es5",
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            incremental: true,
            plugins: [{ name: "next" }],
            paths: { "@/*": ["./*"] }
          },
          include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
          exclude: ["node_modules"]
        }, null, 2)
      });
    }

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
      throw e;
    }
  }

  /**
   * Heal a failed deployment using AI analysis
   */
  async healDeployment(deploymentId: string) {
    const { data: deploy, error: deployError } = await this.supabase
      .from('deployments')
      .select('*')
      .eq('id', deploymentId)
      .single();

    if (deployError || !deploy) throw new Error("Deployment not found");
    if (deploy.status !== 'failed') throw new Error("Only failed deployments can be healed.");

    const { data: files } = await this.supabase
      .from('project_files')
      .select('path, content')
      .eq('project_id', deploy.project_id);

    if (!files || files.length === 0) throw new Error("No files found for this project.");

    const errorLog = deploy.build_log || deploy.error_message || "Unknown build error";
    
    const prompt = `
Build Log:
${errorLog}

Current Files:
${JSON.stringify(files.slice(0, 20))}
    `;

    const response = await this.callAI([
      { role: 'system', content: DEVOPS_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : response;
      return JSON.parse(jsonString);
    } catch (e) {
      throw new Error("AI failed to produce a structured fix. Please check the logs manually.");
    }
  }

  /**
   * Import Figma nodes and convert them to React components
   */
  async importFromFigma(figmaData: any) {
    const nodes = Array.isArray(figmaData.nodes) ? figmaData.nodes : [figmaData.node];
    const results = [];

    for (const node of nodes) {
      const response = await this.callAI([
        { role: 'system', content: FIGMA_SYSTEM_PROMPT },
        { role: 'user', content: `Figma Node Data: ${JSON.stringify(node)}` }
      ]);

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : response;
        const result = JSON.parse(jsonString);
        results.push(...result.files);
      } catch (e) {
        // skip malformed node
      }
    }

    return { files: results };
  }

  /**
   * War Room Multi-Agent Debate
   */
  async conductWarRoomDebate(jobId: string, userPrompt: string) {
    const debate: any[] = [];

    await this.logEvent(jobId, 'Architect', 'thought', 'Designing system architecture...');
    const architectResponse = await this.callAI([
      { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
      { role: 'user', content: `Design a high-level architecture for this request: ${userPrompt}` }
    ]);
    debate.push({ agent: 'Architect', content: architectResponse });
    await this.logEvent(jobId, 'Architect', 'completion', architectResponse);

    await this.logEvent(jobId, 'UI/UX Designer', 'thought', 'Refining user interface and flow...');
    const uiDesignerResponse = await this.callAI([
      { role: 'system', content: UI_DESIGNER_SYSTEM_PROMPT },
      { role: 'user', content: `User Request: ${userPrompt}\n\nArchitect's Proposal: ${architectResponse}\n\nHow should we design the UI to match this architecture?` }
    ]);
    debate.push({ agent: 'UI/UX Designer', content: uiDesignerResponse });
    await this.logEvent(jobId, 'UI/UX Designer', 'completion', uiDesignerResponse);

    await this.logEvent(jobId, 'Security Analyst', 'thought', 'Auditing the proposal for vulnerabilities...');
    const securityResponse = await this.callAI([
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
    const response = await this.callAI([
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
      throw new Error("AI failed to produce a structured database design.");
    }
  }

  /**
   * Generate project documentation and component lab data
   */
  async generateDocumentation(jobId: string, projectId: string) {
    const { data: files } = await this.supabase
      .from('project_files')
      .select('path, content')
      .eq('project_id', projectId);

    if (!files || files.length === 0) throw new Error("No files found for documentation.");

    await this.logEvent(jobId, 'Documentation Agent', 'thought', 'Analyzing project structure for documentation...');
    
    const fileSummary = files.map((f: any) => f.path).join('\n');
    const sampleContent = files.slice(0, 15).map((f: any) => `FILE: ${f.path}\n${f.content.slice(0, 2000)}`).join('\n---\n');

    const response = await this.callAI([
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
      throw new Error("AI failed to produce structured documentation.");
    }
  }

  /**
   * Apply a voice-driven code edit to a specific file
   */
  async applyVoiceEdit(jobId: string, fileContent: string, voiceCommand: string) {
    await this.logEvent(jobId, 'Voice Editor', 'thought', `Interpreting voice command: "${voiceCommand}"`);
    
    const response = await this.callAI([
      { role: 'system', content: VOICE_EDITOR_SYSTEM_PROMPT },
      { role: 'user', content: `Current File Code:\n${fileContent}\n\nVoice Command: "${voiceCommand}"` }
    ]);

    const cleanedCode = response.replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*/g, '').replace(/```/g, '')).trim();
    
    await this.logEvent(jobId, 'Voice Editor', 'completion', `Modified ${cleanedCode.length} characters of code.`);
    return cleanedCode;
  }
}

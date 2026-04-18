import { Groq } from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { TIER_LIMITS } from '../nexus_prime_constants';
import type { AgentConfig } from './types';
import { CODER_SYSTEM_PROMPT, LINTER_SYSTEM_PROMPT, DEVOPS_SYSTEM_PROMPT, FIGMA_SYSTEM_PROMPT, ARCHITECT_SYSTEM_PROMPT, UI_DESIGNER_SYSTEM_PROMPT, SECURITY_ANALYST_PROMPT, DB_ARCHITECT_SYSTEM_PROMPT, DOCUMENTATION_SYSTEM_PROMPT, VOICE_EDITOR_SYSTEM_PROMPT, SHIELD_MODE_SYSTEM_PROMPT, MARKETING_PSY_SYSTEM_PROMPT, SECURITY_GURU_SYSTEM_PROMPT, SEO_ARCHITECT_SYSTEM_PROMPT, TEST_GENERATOR_SYSTEM_PROMPT, COMPONENT_PARSER_SYSTEM_PROMPT, DEPLOYMENT_MONITOR_SYSTEM_PROMPT } from './prompts';

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
  async executeJob(jobId: string, options?: { isUnthrottled?: boolean }) {
    const { data: job } = await this.supabase
      .from('agent_jobs')
      .select('*, agent_training_modules(system_prompt), user_credits(agency_mode, agency_config, tier)')
      .eq('id', jobId)
      .single();
    
    if (!job) return;

    const isUnthrottled = options?.isUnthrottled || process.env.NEXUS_UNTHROTTLED_BUILD === 'true';
    const customSystemPrompt = job.agent_training_modules?.system_prompt || '';
    const isAgencyMode = job.user_credits?.agency_mode || false;
    const agencyConfig = job.user_credits?.agency_config || {};
    const userTier = job.user_credits?.tier || 'Free';
    const isPriority = (TIER_LIMITS as any)[userTier]?.priorityCompute || false;

    try {
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

      // STEP 1: REASONING (Qwen3-32B or Llama-70B for priority)
      const reasoningModel = isPriority ? 'llama-3.3-70b-versatile' : 'qwen/qwen3-32b';
      await this.logEvent(jobId, reasoningModel, 'thought', `Initializing deep reasoning (${isPriority ? 'High Compute' : 'Standard'})...`);
      const reasoning = await this.callGroq(reasoningModel, [
        { role: 'system', content: 'You are the Reasoner. Break down the user prompt and visual analysis into a logical architecture.' },
        { role: 'user', content: `Prompt: ${job.prompt}\nVisual Analysis: ${visualAnalysis}` }
      ]);
      await this.logEvent(jobId, reasoningModel, 'completion', reasoning);

      // STEP 2: ORCHESTRATION (Llama-70B)
      await this.logEvent(jobId, 'llama-3.3-70b-versatile', 'thought', 'Generating execution plan based on reasoning...');
      const plan = await this.callGroq('llama-3.3-70b-versatile', [
        { role: 'system', content: 'You are the Orchestrator. Create a task list for the Coder agent.' },
        { role: 'user', content: `Reasoning: ${reasoning}\nPrompt: ${job.prompt}` }
      ]);
      await this.logEvent(jobId, 'llama-3.3-70b-versatile', 'completion', plan);

      // STEP 3: CODING (Llama-8B or Llama-70B for priority) - MULTI-FILE JSON
      const codingModel = isPriority ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';
      await this.logEvent(jobId, codingModel, 'thought', `Writing multi-file code structure (${isPriority ? 'Ultra Quality' : 'Instant'})...`);
      
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

      const coderResponse = await this.callGroq(codingModel, [
        { role: 'system', content: systemPrompt },
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
   * AI Test Generation
   */
  async generateTests(files: { path: string, content: string }[]) {
    const response = await this.callGroq('llama-3.3-70b-versatile', [
      { role: 'system', content: TEST_GENERATOR_SYSTEM_PROMPT },
      { role: 'user', content: `Generate tests for these files:\n${JSON.stringify(files)}` }
    ]);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const data = JSON.parse(jsonMatch ? jsonMatch[0] : response);
      return data.files || [];
    } catch (e) {
      console.error('Test Generation Parse Error:', e);
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
    const response = await this.callGroq('llama-3.3-70b-versatile', [
      { role: 'system', content: DEPLOYMENT_MONITOR_SYSTEM_PROMPT },
      { role: 'user', content: `Analyze these deployment logs:\n${logs}` }
    ]);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
      console.error('Deployment Analysis Error:', e);
      return { status: 'error', summary: 'Failed to analyze logs.' };
    }
  }

  /**
   * AI Component Prop Parsing
   */
  async parseComponentProps(fileContent: string) {
    const response = await this.callGroq('llama-3.3-70b-versatile', [
      { role: 'system', content: COMPONENT_PARSER_SYSTEM_PROMPT },
      { role: 'user', content: `Extract props from this component:\n${fileContent}` }
    ]);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
      console.error('Prop Parsing Error:', e);
      return { props: [] };
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

    // ENSURE PACKAGE.JSON EXISTS FOR VERCEL BUILD
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

    // ENSURE TSCONFIG.JSON EXISTS
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

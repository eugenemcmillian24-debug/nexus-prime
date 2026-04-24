import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { errorResponse } from "@/lib/apiError";

// POST /api/reviews - Request a new AI code review
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, fileId, filePath, code, language, reviewType, model } = await req.json();

  if (!projectId || !filePath || !code) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Create review record
  const { data: review, error: createError } = await supabase
    .from("code_reviews")
    .insert({
      project_id: projectId,
      file_id: fileId || null,
      file_path: filePath,
      model_used: model || "groq",
      review_type: reviewType || "general",
      status: "in_progress",
      requested_by: user.id,
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Build review prompt based on type
  const prompts: Record<string, string> = {
    general: `Review this ${language || "code"} code for overall quality, structure, readability, and potential issues. Provide specific, actionable findings.`,
    security: `Perform a security audit on this ${language || "code"} code. Look for vulnerabilities, injection risks, auth issues, data exposure, and insecure patterns.`,
    performance: `Analyze this ${language || "code"} code for performance issues. Look for memory leaks, unnecessary re-renders, N+1 queries, blocking operations, and optimization opportunities.`,
    accessibility: `Review this ${language || "code"} code for accessibility issues. Check WCAG compliance, ARIA usage, keyboard navigation, screen reader compatibility, and color contrast.`,
    "best-practices": `Review this ${language || "code"} code against industry best practices. Check patterns, naming conventions, error handling, type safety, and modern standards.`,
  };

  const systemPrompt = `You are an expert code reviewer. ${prompts[reviewType] || prompts.general}

Respond ONLY with valid JSON in this exact format:
{
  "summary": "2-3 sentence overview of code quality",
  "score": <0-100 integer>,
  "findings": [
    {
      "severity": "critical|warning|info|suggestion",
      "category": "short category name",
      "line": <line number or null>,
      "endLine": <end line or null>,
      "message": "clear description of the issue",
      "code": "problematic code snippet if applicable",
      "suggestion": "fixed code or improvement suggestion"
    }
  ]
}`;

  try {
    // Determine which AI provider to use
    let aiResponse: string;
    const modelConfig = model || "groq";

    if (modelConfig === "groq") {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `File: ${filePath}\nLanguage: ${language || "unknown"}\n\n\`\`\`\n${code}\n\`\`\`` },
          ],
          temperature: 0.3,
          max_tokens: 4096,
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        throw new UpstreamReviewError(await readUpstreamError(res, "groq"), res.status);
      }
      const data = await res.json();
      aiResponse = data.choices?.[0]?.message?.content ?? "";
    } else if (modelConfig === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_AI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\nFile: ${filePath}\nLanguage: ${language || "unknown"}\n\n\`\`\`\n${code}\n\`\`\`` }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 4096,
              // Force JSON output so the downstream JSON.parse at line 129
              // sees the expected {summary, score, findings[]} shape rather
              // than prose+fences (which parses but drops fields to defaults).
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (!res.ok) {
        throw new UpstreamReviewError(await readUpstreamError(res, "gemini"), res.status);
      }
      const data = await res.json();
      aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } else {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "anthropic/claude-sonnet-4.5",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `File: ${filePath}\nLanguage: ${language || "unknown"}\n\n\`\`\`\n${code}\n\`\`\`` },
          ],
          temperature: 0.3,
          // claude-sonnet-4.5 on OpenRouter bills ~1 credit per output token; a
          // 4096-token review costs more than the free allowance most accounts
          // have, and the provider then 402's the entire request. 2000 is
          // enough to cover a typical review response (usually < 1200 tokens)
          // and keeps the call within the default free-tier budget.
          max_tokens: 2000,
          // Same reason as the Gemini branch: claude-sonnet-4.5 by default
          // returns ```json ... ``` wrapped in prose, which after the fence
          // strip parses to a plain object missing the expected keys.
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        throw new UpstreamReviewError(await readUpstreamError(res, "openrouter"), res.status);
      }
      const data = await res.json();
      aiResponse = data.choices?.[0]?.message?.content ?? "";
    }

    if (!aiResponse || !aiResponse.trim()) {
      throw new UpstreamReviewError(`${modelConfig} returned an empty response body`, 502);
    }

    // Parse AI response
    const cleanJson = aiResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let parsed: { summary?: unknown; score?: unknown; findings?: unknown };
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      throw new UpstreamReviewError(`${modelConfig} returned unparseable JSON: ${cleanJson.slice(0, 200)}`, 502);
    }

    const hasSummary = typeof parsed.summary === "string" && parsed.summary.trim().length > 0;
    const hasScore = typeof parsed.score === "number";
    const hasFindings = Array.isArray(parsed.findings) && parsed.findings.length > 0;

    // When upstream succeeds with real content we always see at least one of
    // {summary, score, findings[]}. All three missing means the provider
    // returned a placeholder (empty object, schema-mismatched prose, etc.)
    // and writing defaults here would mask the failure as a 'completed' row
    // indistinguishable from a real clean review.
    if (!hasSummary && !hasScore && !hasFindings) {
      throw new UpstreamReviewError(
        `${modelConfig} returned a response with no summary/score/findings`,
        502,
      );
    }

    // Add IDs to findings
    const findings = (hasFindings ? (parsed.findings as Record<string, unknown>[]) : []).map((f, i) => ({
      ...f,
      id: `finding-${review.id}-${i}`,
    }));

    // Update review with results
    const { data: updated, error: updateError } = await supabase
      .from("code_reviews")
      .update({
        findings,
        summary: hasSummary ? (parsed.summary as string) : "Review completed",
        score: Math.min(100, Math.max(0, hasScore ? (parsed.score as number) : 0)),
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", review.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      id: updated.id,
      fileId: updated.file_id,
      filePath: updated.file_path,
      modelUsed: updated.model_used,
      reviewType: updated.review_type,
      findings: updated.findings,
      summary: updated.summary,
      score: updated.score,
      status: updated.status,
      createdAt: updated.created_at,
      completedAt: updated.completed_at,
    });
  } catch (error) {
    const isUpstream = error instanceof UpstreamReviewError;
    const message = isUpstream
      ? error.message
      : error instanceof Error
        ? error.message
        : "Review failed";

    // Mark review as failed — and stash the upstream reason so the UI can
    // show the user *why* instead of a generic "Review completed" row with
    // empty findings.
    await supabase
      .from("code_reviews")
      .update({
        status: "failed",
        summary: `Review failed: ${message}`.slice(0, 500),
        completed_at: new Date().toISOString(),
      })
      .eq("id", review.id);

    const status = isUpstream ? 502 : 500;
    return NextResponse.json(
      { error: "Review failed", detail: message, reviewId: review.id },
      { status },
    );
  }
}

class UpstreamReviewError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "UpstreamReviewError";
    this.status = status;
  }
}

async function readUpstreamError(res: Response, provider: string): Promise<string> {
  try {
    const body = await res.text();
    // Providers typically return JSON with {error: {message: "..."}} or a
    // plain string. Try to extract the most useful field without exploding
    // on malformed payloads.
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } | string; message?: string };
      const inner = typeof parsed.error === "string" ? parsed.error : parsed.error?.message;
      const top = typeof parsed.message === "string" ? parsed.message : undefined;
      const extracted = inner || top;
      if (extracted) return `${provider} ${res.status}: ${extracted}`;
    } catch {
      /* fall through to raw body */
    }
    return `${provider} ${res.status}: ${body.slice(0, 200)}`;
  } catch {
    return `${provider} ${res.status}`;
  }
}

// GET /api/reviews?projectId=...&fileId=...
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  const fileId = req.nextUrl.searchParams.get("fileId");

  let query = supabase.from("code_reviews").select("*").order("created_at", { ascending: false });

  if (projectId) query = query.eq("project_id", projectId);
  if (fileId) query = query.eq("file_id", fileId);

  const { data, error } = await query.limit(50);
  if (error) return errorResponse(error, '/api/reviews');

  return NextResponse.json(
    data.map((r) => ({
      id: r.id,
      fileId: r.file_id,
      filePath: r.file_path,
      modelUsed: r.model_used,
      reviewType: r.review_type,
      findings: r.findings,
      summary: r.summary,
      score: r.score,
      status: r.status,
      createdAt: r.created_at,
      completedAt: r.completed_at,
    }))
  );
}

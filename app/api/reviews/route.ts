import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { errorResponse } from "@/lib/apiError";
import { aiComplete } from "@/lib/ai";

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
    const modelConfig = model || "zen";

    aiResponse = await aiComplete([
      { role: "system", content: systemPrompt },
      { role: "user", content: `File: ${filePath}\nLanguage: ${language || "unknown"}\n\n\`\`\`\n${code}\n\`\`\`` },
    ], { 
      preferModel: model === 'claude' ? 'claude-3-5-sonnet' : 'gpt-4o',
      temperature: 0.3,
      max_tokens: 4096 
    });

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

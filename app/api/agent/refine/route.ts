import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/api";
import { z, ZodError } from "zod";
import { aiComplete } from "@/lib/ai";
import { isNexusPrimeAdmin } from "@/lib/nexus_prime_access";
import { errorResponse } from "@/lib/apiError";
import { waitUntil } from "@vercel/functions";

const RefineSchema = z.object({
  userId: z.string().uuid(),
  parentJobId: z.string().uuid(),
  refinementPrompt: z.string().min(1).max(2000),
  currentCode: z.string(),
});

const REFINE_SYSTEM_PROMPT = `
You are the NEXUS PRIME Refinement Agent. You modify existing code based on user instructions.
You receive the current code (JSON with files array) and a refinement request.

RULES:
1. ONLY modify what the user asks for. Do NOT rewrite unrelated code.
2. Maintain the existing file structure. Add new files only if necessary.
3. Return the COMPLETE updated files array as JSON: { "files": [...] }
4. Keep all TypeScript types, imports, and existing functionality intact.
5. OUTPUT: Return ONLY the raw JSON string. No markdown, no explanation.
`.trim();

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    const body = await req.json();
    const { parentJobId, refinementPrompt, currentCode } =
      RefineSchema.parse({ ...body, userId: user.id });

    // Verify user owns the parent job
    const { data: parentJob } = await supabase
      .from("agent_jobs")
      .select("id, user_id, version, thread_id")
      .eq("id", parentJobId)
      .single();

    if (!parentJob || parentJob.user_id !== userId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Deduct credits (refinement costs 5 credits)
    const isAdmin = await isNexusPrimeAdmin();
    let creditResult = { success: true, new_balance: Infinity };

    if (!isAdmin) {
      const { data: rpcResult, error: creditError } = await supabase.rpc(
        "deduct_user_credits",
        { target_user_id: userId, amount_to_deduct: 5 }
      );

      if (creditError || !rpcResult?.success) {
        return NextResponse.json(
          { error: rpcResult?.error || "Insufficient credits" },
          { status: 402 }
        );
      }
      creditResult = rpcResult;
    }

    const newVersion = (parentJob.version || 1) + 1;

    // Create a pending job
    const { data: newJob, error: jobError } = await supabase
      .from("agent_jobs")
      .insert({
        user_id: userId,
        status: "pending",
        agent_type: "refiner",
        prompt: refinementPrompt,
        parent_job_id: parentJobId,
        thread_id: parentJob.thread_id,
        version: newVersion,
        credits_cost: 5,
      })
      .select()
      .single();

    if (jobError || !newJob) {
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }

    // Background process using waitUntil
    waitUntil((async () => {
      try {
        // Call refinement agent
        const rawOutput = await aiComplete([
          { role: "system", content: REFINE_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Current Code:\n${currentCode}\n\nRefinement Request: ${refinementPrompt}`,
          },
        ], { preferModel: "llama-3.3-70b-versatile" });

        let refinedCode;
        try {
          const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
          refinedCode = JSON.parse(jsonMatch ? jsonMatch[0] : rawOutput);
        } catch {
          refinedCode = JSON.parse(currentCode);
        }

        // Update job with result
        await supabase
          .from("agent_jobs")
          .update({
            status: "completed",
            result: {
              code: refinedCode,
              refinement: true,
              parentJobId,
            },
          })
          .eq("id", newJob.id);
          
      } catch (err) {
        console.error("Background refinement error:", err);
        await supabase
          .from("agent_jobs")
          .update({ status: "failed" })
          .eq("id", newJob.id);
      }
    })());

    return NextResponse.json({
      jobId: newJob.id,
      status: "pending",
      version: newVersion,
      newBalance: creditResult.new_balance,
    });

  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return errorResponse(error, "Refinement API Error");
  }
}

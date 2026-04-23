import { NextResponse } from "next/server";

/**
 * Build a standardized 500 response for API route catch blocks.
 *
 * Goals:
 *  - Always log the full error server-side with a generated trace ID so
 *    operators can grep Vercel logs (`console.error` output is indexed).
 *  - In non-production, return the real `error.message` so local and
 *    preview developers can debug without tailing logs.
 *  - In production, return the generic `"Internal Server Error"` string
 *    (matching the pre-existing PROD FIX sanitization) plus the trace
 *    ID, so consumers still have a handle to correlate with logs but
 *    we don't leak PostgrestError details, schema names, or other
 *    internals to third parties.
 *
 * This replaces the two anti-patterns that co-existed in this codebase:
 *  - Bare `{ error: "Internal Server Error" }`  — debuggable by nobody.
 *  - Bare `{ error: error.message }`            — leaks internals.
 */
export function errorResponse(error: unknown, logLabel: string) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  const traceId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 12);

  console.error(`[${traceId}] ${logLabel}:`, error);

  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json(
    {
      error: isDev ? message : "Internal Server Error",
      traceId,
    },
    { status: 500 },
  );
}

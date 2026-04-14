# Nexus Prime — Bug Report

## Critical Bugs (will crash or fail to build)
1. `NexusErrorBoundary.tsx:65` — `onClick={handleReset}` → should be `onClick={this.handleReset}` (class method)
2. `package.json` — missing `stripe` package (used in 2 billing routes)
3. `package.json` — missing `@supabase/auth-helpers-nextjs` (used in auth callback)
4. `app/api/transcribe/route.ts` — missing `googleAIKey` in NexusOrchestrator constructor (required field)
5. `next.config.js` — transpiles `@nexus/ui` which doesn't exist anywhere

## Production Bugs
6. `next.config.js` — `experimental.serverActions: true` is deprecated/removed in Next.js 14
7. `lib/validations.ts` — imageUrl not nullable; fails when user clears screenshot (null passed)
8. `lib/ai.ts` — uses `llama-3.1-70b-versatile` (Groq deprecated it); should be `llama-3.3-70b-versatile`
9. `components/CodePreview.tsx:84` — double protocol bug: `https://${deploymentUrl}` but Vercel may return URL with protocol already
10. `components/VoiceRecorder.tsx:98` — `Math.random()` in render causes flickering on every re-render

## Missing / Docs
11. `app/api/deploy/route.ts` — no Zod input validation (unlike all other routes)
12. `.env.example` missing; DEPLOYMENT.md also omits `GOOGLE_AI_KEY`, `VERCEL_TOKEN`, `VERCEL_TEAM_ID`

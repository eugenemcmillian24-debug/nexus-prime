import { NextResponse } from 'next/server';
import { isNexusPrimeAdmin } from '@/lib/nexus_prime_access';
import { errorResponse } from "@/lib/apiError";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const isAdmin = await isNexusPrimeAdmin();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const deploymentId = searchParams.get('deploymentId');

    let targetId = deploymentId;

    if (!targetId) {
      // Fetch latest deployment if no ID provided
      const res = await fetch(`https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=1`, {
        headers: { "Authorization": `Bearer ${VERCEL_TOKEN}` }
      });
      const data = await res.json();
      if (data.deployments?.[0]) {
        targetId = data.deployments[0].uid;
      }
    }

    if (!targetId) return NextResponse.json({ error: "No deployment found" }, { status: 404 });

    const logRes = await fetch(`https://api.vercel.com/v2/deployments/${targetId}/events`, {
      headers: { "Authorization": `Bearer ${VERCEL_TOKEN}` }
    });

    if (!logRes.ok) throw new Error("Failed to fetch logs");

    const events = await logRes.json();
    return NextResponse.json({ events, deploymentId: targetId });
  } catch (error) {
    return errorResponse(error, '/api/admin/vercel-logs');
  }
}

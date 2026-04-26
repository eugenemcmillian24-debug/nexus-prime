import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';
import { ForgeOperator } from '@/lib/operator';
import { isNexusPrimeAdmin } from '@/lib/nexus_prime_access';

export async function POST(req: Request) {
  try {
    const isAdmin = await isNexusPrimeAdmin();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, jobId, reason } = body;

    const operator = new ForgeOperator(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let result;
    switch (action) {
      case 'retry':
        result = await operator.retryJob(jobId);
        break;
      case 'resume':
        result = await operator.resumeJob(jobId);
        break;
      case 'bypass':
        result = await operator.bypassVerification(jobId);
        break;
      case 'fail':
        result = await operator.forceFail(jobId, reason || 'Manual intervention');
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';
import { isNexusPrimeAdmin } from '@/lib/nexus_prime_access';

export async function GET(req: Request) {
  try {
    const isAdmin = await isNexusPrimeAdmin();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createClient();
    
    // Fetch total domains
    const { count: total } = await supabase
      .from('custom_domains')
      .select('*', { count: 'exact', head: true });

    // Fetch pending domains
    const { count: pending } = await supabase
      .from('custom_domains')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Fetch total fees collected (assuming 10 credits = $10 for simplicity in this demo)
    const { data: domains } = await supabase
      .from('custom_domains')
      .select('protocol_fee_paid');

    const feesCollected = (domains?.filter(d => d.protocol_fee_paid).length || 0) * 10;

    return NextResponse.json({
      total: total || 0,
      pending: pending || 0,
      feesCollected
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

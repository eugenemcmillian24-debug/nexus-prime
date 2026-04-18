import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';

// GET /api/agent/training/analytics - Fetch blueprint analytics for the user
export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Get overall stats for all user's modules
    const { data: modules, error: modulesError } = await supabase
      .from('agent_training_modules')
      .select('id, name, usage_count, price')
      .eq('user_id', user.id);

    if (modulesError) throw modulesError;

    // 2. Get recent transactions
    const { data: transactions, error: txError } = await supabase
      .from('marketplace_transactions')
      .select('*, buyer_id, module_id, created_at')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (txError) throw txError;

    const totalSales = modules?.reduce((acc, m) => acc + (m.usage_count || 0), 0) || 0;
    const totalEarnings = transactions?.reduce((acc, t) => acc + (t.amount - t.platform_fee), 0) || 0;

    return NextResponse.json({
      summary: {
        totalSales,
        totalEarnings,
        activeModules: modules?.length || 0
      },
      modules: modules || [],
      recentTransactions: transactions || []
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

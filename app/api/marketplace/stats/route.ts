import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';
import { errorResponse } from "@/lib/apiError";

export const dynamic = 'force-dynamic';

// GET /api/marketplace/stats - Fetch seller statistics
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Fetch total earnings and sales count from blueprint_transactions
    // This table records every purchase of the user's blueprints
    const { data: sales, error: salesError } = await supabase
      .from('blueprint_transactions')
      .select('amount, created_at')
      .eq('seller_id', user.id);

    if (salesError) throw salesError;

    // 2. Fetch listed modules
    const { data: modules, error: modulesError } = await supabase
      .from('agent_training_modules')
      .select('id, name, price, usage_count, rating')
      .eq('author_id', user.id);

    if (modulesError) throw modulesError;

    const totalEarnings = (sales || []).reduce((sum, s) => sum + s.amount, 0);
    const totalSales = (sales || []).length;

    // 3. Group sales by date for a simple chart
    const earningsHistory = (sales || []).reduce((acc: any, s) => {
        const date = new Date(s.created_at).toLocaleDateString();
        acc[date] = (acc[date] || 0) + s.amount;
        return acc;
    }, {});

    return NextResponse.json({
      summary: {
        totalEarnings,
        totalSales,
        listedModules: modules?.length || 0,
        averageRating: modules?.length ? (modules.reduce((sum, m) => sum + (m.rating || 0), 0) / modules.length).toFixed(1) : 0
      },
      modules: modules || [],
      earningsHistory: Object.entries(earningsHistory).map(([date, amount]) => ({ date, amount })).slice(-7)
    });

  } catch (error: any) {
    return errorResponse(error, "Seller Stats Error:");
  }
}

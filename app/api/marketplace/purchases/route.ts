import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';
import { errorResponse } from "@/lib/apiError";

export const dynamic = "force-dynamic";

// GET /api/marketplace/purchases - Fetch user's purchased blueprints
export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from('marketplace_purchases')
      .select('module_id')
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ purchasedModuleIds: data.map((d: any) => d.module_id) });
  } catch (error) {
    return errorResponse(error, '/api/marketplace/purchases');
  }
}

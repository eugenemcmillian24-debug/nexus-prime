import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';

// POST /api/marketplace/purchase - Purchase a blueprint
export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { moduleId } = await req.json();

    if (!moduleId) {
      return NextResponse.json({ error: "Module ID is required" }, { status: 400 });
    }

    // Call the RPC function for atomic transaction
    const { data, error } = await supabase.rpc('purchase_blueprint', {
      p_buyer_id: user.id,
      p_module_id: moduleId
    });

    if (error) throw error;

    if (!data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, newBalance: data.new_balance });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

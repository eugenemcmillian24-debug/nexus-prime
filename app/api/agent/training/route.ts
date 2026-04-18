import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';

// GET /api/agent/training - Fetch user's training modules or public ones
export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const isPublic = searchParams.get('public') === 'true';

    let query = supabase.from('agent_training_modules').select('*');

    if (isPublic) {
      query = query.eq('is_public', true).neq('user_id', user.id);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ modules: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/agent/training - Create a new training module
export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, description, system_prompt, training_data, is_public, price } = await req.json();

    if (!name || !system_prompt) {
      return NextResponse.json({ error: "Name and system prompt are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('agent_training_modules')
      .insert({
        user_id: user.id,
        name,
        description,
        system_prompt,
        training_data: training_data || [],
        is_public: is_public || false,
        price: price || 0
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ module: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

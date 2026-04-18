import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: credits } = await supabase
    .from('user_credits')
    .select('agency_mode, agency_config')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json(credits);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { agency_config } = await req.json();

  const { data, error } = await supabase
    .from('user_credits')
    .update({ agency_config })
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/api';
import { isNexusPrimeAdmin } from '@/lib/nexus_prime_access';
import { errorResponse } from "@/lib/apiError";

// GET /api/admin/marketplace - Fetch all public modules for moderation
export async function GET(req: Request) {
  try {
    const isAdmin = await isNexusPrimeAdmin();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createClient();
    const { data, error } = await supabase
      .from('agent_training_modules')
      .select('*, profiles(email)')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ modules: data });
  } catch (error) {
    return errorResponse(error, '/api/admin/marketplace');
  }
}

// PATCH /api/admin/marketplace - Toggle featured status
export async function PATCH(req: Request) {
  try {
    const isAdmin = await isNexusPrimeAdmin();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { moduleId, isFeatured } = await req.json();

    if (!moduleId) {
      return NextResponse.json({ error: "Module ID is required" }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('agent_training_modules')
      .update({ is_featured: isFeatured })
      .eq('id', moduleId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ module: data });
  } catch (error) {
    return errorResponse(error, '/api/admin/marketplace');
  }
}

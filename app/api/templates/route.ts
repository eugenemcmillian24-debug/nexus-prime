import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const MOCK_TEMPLATES = [
  {
    id: 't1',
    name: 'SaaS Dashboard Starter',
    description: 'A professional dashboard with sidebar, stats, and real-time charts.',
    tags: ['Next.js', 'Dashboard', 'Admin'],
    author: 'Nexus Prime',
    stars: 1250,
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400',
    prompt: 'Create a comprehensive SaaS dashboard with a dark sidebar, stat cards, and an interactive revenue chart.'
  },
  {
    id: 't2',
    name: 'E-commerce Storefront',
    description: 'Modern shopping experience with product grid and cart logic.',
    tags: ['E-commerce', 'Tailwind', 'Stripe'],
    author: 'DesignGuru',
    stars: 890,
    thumbnail: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=400',
    prompt: 'Build a high-converting e-commerce storefront with product filtering, search, and a slide-over shopping cart.'
  },
  {
    id: 't3',
    name: 'AI Image Generator UI',
    description: 'Clean interface for DALL-E or Midjourney integrations.',
    tags: ['AI', 'Gallery', 'Glassmorphism'],
    author: 'FutureLab',
    stars: 2100,
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400',
    prompt: 'Design a glassmorphic interface for an AI image generator with a prompt input, style presets, and an image grid.'
  }
];

export async function GET() {
  return NextResponse.json(MOCK_TEMPLATES);
}

export async function POST(req: Request) {
  try {
    const { name, description, prompt, tags, projectId } = await req.json();
    
    // In a real app, we would save this to the 'templates' table
    // and potentially snapshot the project_files.
    
    return NextResponse.json({ 
      success: true, 
      message: 'Project published as template!',
      template: { id: Math.random().toString(36).substr(2, 9), name, description }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

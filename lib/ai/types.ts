// AI types and interfaces - extracted from lib/ai.ts
import { Groq } from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { TIER_LIMITS } from '../nexus_prime_constants';

export interface AgentConfig {
  groqKey: string;
  openRouterKey: string;
  googleAIKey: string;
  supabaseUrl: string;
  supabaseKey: string;
}


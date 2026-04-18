-- 011_agent_training_lab.sql
-- Implement Custom Agent Training Modules

CREATE TABLE IF NOT EXISTS public.agent_training_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    training_data JSONB DEFAULT '[]'::jsonb,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.agent_training_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own training modules"
    ON public.agent_training_modules
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view public training modules"
    ON public.agent_training_modules
    FOR SELECT
    USING (is_public = true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agent_training_modules_updated_at
    BEFORE UPDATE ON public.agent_training_modules
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Add training_module_id to agent_jobs for tracking
ALTER TABLE public.agent_jobs ADD COLUMN IF NOT EXISTS training_module_id UUID REFERENCES public.agent_training_modules(id) ON DELETE SET NULL;

-- Add agency_mode to user_credits
ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS agency_mode BOOLEAN DEFAULT false;

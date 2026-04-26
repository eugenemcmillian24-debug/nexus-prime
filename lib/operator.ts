import { createClient } from '@supabase/supabase-js';

export class ForgeOperator {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async retryJob(jobId: string) {
    const { data, error } = await this.supabase
      .from('agent_jobs')
      .update({ 
        status: 'pending', 
        current_step: 'pending',
        error: null,
        retry_count_total: 0 // Reset or increment? Usually reset for manual retry
      })
      .eq('id', jobId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async resumeJob(jobId: string) {
    const { data: job } = await this.supabase
      .from('agent_jobs')
      .select('status, current_step')
      .eq('id', jobId)
      .single();

    if (job?.status === 'failed') {
      await this.supabase
        .from('agent_jobs')
        .update({ status: 'running', error: null })
        .eq('id', jobId);
    }
    return { success: true };
  }

  async bypassVerification(jobId: string) {
    await this.supabase
      .from('agent_jobs')
      .update({ 
        current_step: 'DEPLOYING',
        verification_results: { bypassed: true, bypassed_at: new Date().toISOString() }
      })
      .eq('id', jobId);
    
    return { success: true };
  }

  async forceFail(jobId: string, reason: string) {
    await this.supabase
      .from('agent_jobs')
      .update({ status: 'failed', error: reason })
      .eq('id', jobId);
    
    return { success: true };
  }
}

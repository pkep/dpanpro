import { supabase } from '@/integrations/supabase/client';

export async function recordInterventionStatusChange(
  interventionId: string,
  status: string
): Promise<void> {
  const { error } = await supabase
    .from('intervention_history_status')
    .insert({
      intervention_id: interventionId,
      status,
      changed_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error recording intervention status change:', error);
    throw error;
  }
}

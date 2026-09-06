import { supabase } from '@/integrations/supabase/client';
import type { InterventionStatus } from '@/types/intervention.types';
import type { TablesInsert } from '@/integrations/supabase/types';

/**
 * Journalise un changement de statut d'intervention dans
 * intervention_history_status (même table que la Gateway et
 * les Edge Functions Supabase).
 */
export async function recordInterventionStatusChange(
  interventionId: string,
  status: InterventionStatus,
): Promise<void> {
  // Règle : ignorer si le statut est identique au précédent
  const { data: last } = await supabase
    .from('intervention_history_status')
    .select('status')
    .eq('intervention_id', interventionId)
    .order('changed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last?.status === status) return;

  const { error } = await supabase
    .from('intervention_history_status')
    .insert({
      intervention_id: interventionId,
      status,
    } as TablesInsert<'intervention_history_status'>);

  if (error) {
    console.error(`Failed to record intervention history status ${status} for ${interventionId}:`, error);
  }
}
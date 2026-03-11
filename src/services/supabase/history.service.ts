import { supabase } from '@/integrations/supabase/client';
import type { InterventionHistory, DbInterventionHistory, HistoryAction } from '@/types/history.types';

class HistoryService {
  async getHistoryForIntervention(interventionId: string): Promise<InterventionHistory[]> {
    const { data, error } = await supabase
      .from('intervention_history')
      .select('*')
      .eq('intervention_id', interventionId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return ((data || []) as unknown as DbInterventionHistory[]).map(this.mapToHistory);
  }

  async addHistoryEntry(params: {
    interventionId: string;
    userId: string;
    action: HistoryAction;
    oldValue?: string | null;
    newValue?: string | null;
    comment?: string | null;
  }): Promise<void> {
    const { error } = await supabase
      .from('intervention_history')
      .insert({
        intervention_id: params.interventionId,
        user_id: params.userId,
        action: params.action,
        old_value: params.oldValue || null,
        new_value: params.newValue || null,
        comment: params.comment || null,
      });

    if (error) throw error;
  }

  private mapToHistory(data: DbInterventionHistory): InterventionHistory {
    return {
      id: data.id,
      interventionId: data.intervention_id,
      userId: data.user_id,
      action: data.action as HistoryAction,
      oldValue: data.old_value,
      newValue: data.new_value,
      comment: data.comment,
      createdAt: data.created_at,
    };
  }
}

export const historyService = new HistoryService();

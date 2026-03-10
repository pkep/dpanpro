import type { InterventionHistory, HistoryAction } from '@/types/history.types';

export interface IHistoryService {
  getHistoryForIntervention(interventionId: string): Promise<InterventionHistory[]>;
  addHistoryEntry(params: {
    interventionId: string;
    userId: string;
    action: HistoryAction;
    oldValue?: string | null;
    newValue?: string | null;
    comment?: string | null;
  }): Promise<void>;
}

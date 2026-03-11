import type { IHistoryService } from '@/services/interfaces/history.interface';
import type { InterventionHistory, HistoryAction } from '@/types/history.types';
import { springHttp } from './http-client';

export class SpringHistoryService implements IHistoryService {
  // GET /interventions/{id}/history
  async getHistoryForIntervention(interventionId: string): Promise<InterventionHistory[]> {
    return springHttp.get(`/interventions/${interventionId}/history`);
  }

  // POST /interventions/{id}/history
  async addHistoryEntry(params: {
    interventionId: string;
    userId: string;
    action: HistoryAction;
    oldValue?: string | null;
    newValue?: string | null;
    comment?: string | null;
  }): Promise<void> {
    const { interventionId, ...body } = params;
    await springHttp.post(`/interventions/${interventionId}/history`, body);
  }
}

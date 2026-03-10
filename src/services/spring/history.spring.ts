import type { IHistoryService } from '@/services/interfaces/history.interface';
import type { InterventionHistory, HistoryAction } from '@/types/history.types';
import { springHttp } from './http-client';

export class SpringHistoryService implements IHistoryService {
  async getHistoryForIntervention(interventionId: string): Promise<InterventionHistory[]> {
    return springHttp.get(`/history/${interventionId}`);
  }
  async addHistoryEntry(params: { interventionId: string; userId: string; action: HistoryAction; oldValue?: string | null; newValue?: string | null; comment?: string | null }): Promise<void> {
    await springHttp.post('/history', params);
  }
}

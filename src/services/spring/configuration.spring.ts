import type { IConfigurationService } from '@/services/interfaces/configuration.interface';
import type { DispatchAlgorithmConfig, ConfigurationHistoryEntry } from '@/services/configuration/configuration.service';
import { springHttp } from './http-client';

export class SpringConfigurationService implements IConfigurationService {
  // GET /configuration/dispatch-algorithm
  async getDispatchAlgorithmConfig(): Promise<DispatchAlgorithmConfig | null> {
    return springHttp.get('/configuration/dispatch-algorithm');
  }

  // PATCH /configuration/dispatch-algorithm (changed from PUT to PATCH)
  async updateDispatchAlgorithmConfig(config: any, _changedBy: string, reason?: string): Promise<void> {
    await springHttp.patch('/configuration/dispatch-algorithm', { ...config, reason });
  }

  // GET /configuration/history?tableName=&recordId=&limit=
  async getConfigurationHistory(tableName?: string, recordId?: string, limit?: number): Promise<ConfigurationHistoryEntry[]> {
    const params: Record<string, string> = {};
    if (tableName) params.tableName = tableName;
    if (recordId) params.recordId = recordId;
    if (limit) params.limit = String(limit);
    return springHttp.get('/configuration/history', params);
  }

  // Configuration history is logged server-side now; this is a no-op
  async logConfigChange(_tableName: string, _recordId: string, _fieldName: string, _oldValue: string | null, _newValue: string | null, _changedBy: string, _reason?: string): Promise<void> {}
}

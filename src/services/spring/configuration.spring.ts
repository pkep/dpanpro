import type { IConfigurationService } from '@/services/interfaces/configuration.interface';
import type { DispatchAlgorithmConfig, ConfigurationHistoryEntry } from '@/services/configuration/configuration.service';
import { springHttp } from './http-client';

export class SpringConfigurationService implements IConfigurationService {
  async getDispatchAlgorithmConfig(): Promise<DispatchAlgorithmConfig | null> {
    return springHttp.get('/configuration/dispatch-algorithm');
  }
  async updateDispatchAlgorithmConfig(config: any, changedBy: string, reason?: string): Promise<void> {
    await springHttp.put('/configuration/dispatch-algorithm', { ...config, changedBy, reason });
  }
  async getConfigurationHistory(tableName?: string, recordId?: string, limit?: number): Promise<ConfigurationHistoryEntry[]> {
    const params: Record<string, string> = {};
    if (tableName) params.tableName = tableName;
    if (recordId) params.recordId = recordId;
    if (limit) params.limit = String(limit);
    return springHttp.get('/configuration/history', params);
  }
  async logConfigChange(tableName: string, recordId: string, fieldName: string, oldValue: string | null, newValue: string | null, changedBy: string, reason?: string): Promise<void> {
    await springHttp.post('/configuration/history', { tableName, recordId, fieldName, oldValue, newValue, changedBy, reason });
  }
}

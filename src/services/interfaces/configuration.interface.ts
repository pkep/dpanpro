import type { DispatchAlgorithmConfig, ConfigurationHistoryEntry } from '@/services/configuration/configuration.service';

export interface IConfigurationService {
  getDispatchAlgorithmConfig(): Promise<DispatchAlgorithmConfig | null>;
  updateDispatchAlgorithmConfig(
    config: Partial<Omit<DispatchAlgorithmConfig, 'id' | 'createdAt' | 'updatedAt'>>,
    changedBy: string,
    reason?: string
  ): Promise<void>;
  getConfigurationHistory(tableName?: string, recordId?: string, limit?: number): Promise<ConfigurationHistoryEntry[]>;
  logConfigChange(tableName: string, recordId: string, fieldName: string, oldValue: string | null, newValue: string | null, changedBy: string, reason?: string): Promise<void>;
}

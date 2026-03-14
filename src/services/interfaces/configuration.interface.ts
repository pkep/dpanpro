export interface DispatchAlgorithmConfig {
  id: string;
  weightProximity: number;
  weightSkills: number;
  weightWorkload: number;
  weightRating: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface ConfigurationHistoryEntry {
  id: string;
  tableName: string;
  recordId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedAt: string;
  changeReason: string | null;
}

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

import { supabase } from '@/integrations/supabase/client';

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

interface DbDispatchConfig {
  id: string;
  weight_proximity: number;
  weight_skills: number;
  weight_workload: number;
  weight_rating: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface DbConfigHistory {
  id: string;
  table_name: string;
  record_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
  change_reason: string | null;
}

class ConfigurationService {
  async getDispatchAlgorithmConfig(): Promise<DispatchAlgorithmConfig | null> {
    const { data, error } = await supabase
      .from('dispatch_algorithm_config')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapToDispatchConfig(data as unknown as DbDispatchConfig);
  }

  async updateDispatchAlgorithmConfig(
    config: Partial<Omit<DispatchAlgorithmConfig, 'id' | 'createdAt' | 'updatedAt'>>,
    changedBy: string,
    reason?: string
  ): Promise<void> {
    const currentConfig = await this.getDispatchAlgorithmConfig();
    if (!currentConfig) throw new Error('No active dispatch config found');

    // Build update object
    const updateData: Record<string, unknown> = {};
    const historyEntries: Array<{
      table_name: string;
      record_id: string;
      field_name: string;
      old_value: string | null;
      new_value: string | null;
      changed_by: string;
      change_reason: string | null;
    }> = [];

    if (config.weightProximity !== undefined && config.weightProximity !== currentConfig.weightProximity) {
      updateData.weight_proximity = config.weightProximity;
      historyEntries.push({
        table_name: 'dispatch_algorithm_config',
        record_id: currentConfig.id,
        field_name: 'weight_proximity',
        old_value: currentConfig.weightProximity.toString(),
        new_value: config.weightProximity.toString(),
        changed_by: changedBy,
        change_reason: reason || null,
      });
    }

    if (config.weightSkills !== undefined && config.weightSkills !== currentConfig.weightSkills) {
      updateData.weight_skills = config.weightSkills;
      historyEntries.push({
        table_name: 'dispatch_algorithm_config',
        record_id: currentConfig.id,
        field_name: 'weight_skills',
        old_value: currentConfig.weightSkills.toString(),
        new_value: config.weightSkills.toString(),
        changed_by: changedBy,
        change_reason: reason || null,
      });
    }

    if (config.weightWorkload !== undefined && config.weightWorkload !== currentConfig.weightWorkload) {
      updateData.weight_workload = config.weightWorkload;
      historyEntries.push({
        table_name: 'dispatch_algorithm_config',
        record_id: currentConfig.id,
        field_name: 'weight_workload',
        old_value: currentConfig.weightWorkload.toString(),
        new_value: config.weightWorkload.toString(),
        changed_by: changedBy,
        change_reason: reason || null,
      });
    }

    if (config.weightRating !== undefined && config.weightRating !== currentConfig.weightRating) {
      updateData.weight_rating = config.weightRating;
      historyEntries.push({
        table_name: 'dispatch_algorithm_config',
        record_id: currentConfig.id,
        field_name: 'weight_rating',
        old_value: currentConfig.weightRating.toString(),
        new_value: config.weightRating.toString(),
        changed_by: changedBy,
        change_reason: reason || null,
      });
    }

    if (Object.keys(updateData).length === 0) return;

    // Update config
    const { error: updateError } = await supabase
      .from('dispatch_algorithm_config')
      .update(updateData)
      .eq('id', currentConfig.id);

    if (updateError) throw updateError;

    // Log history
    if (historyEntries.length > 0) {
      const { error: historyError } = await supabase
        .from('configuration_history')
        .insert(historyEntries);

      if (historyError) console.error('Failed to log config history:', historyError);
    }
  }

  async getConfigurationHistory(
    tableName?: string,
    recordId?: string,
    limit = 50
  ): Promise<ConfigurationHistoryEntry[]> {
    let query = supabase
      .from('configuration_history')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (tableName) {
      query = query.eq('table_name', tableName);
    }
    if (recordId) {
      query = query.eq('record_id', recordId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return ((data || []) as unknown as DbConfigHistory[]).map(this.mapToHistoryEntry);
  }

  async logConfigChange(
    tableName: string,
    recordId: string,
    fieldName: string,
    oldValue: string | null,
    newValue: string | null,
    changedBy: string,
    reason?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('configuration_history')
      .insert({
        table_name: tableName,
        record_id: recordId,
        field_name: fieldName,
        old_value: oldValue,
        new_value: newValue,
        changed_by: changedBy,
        change_reason: reason || null,
      });

    if (error) throw error;
  }

  private mapToDispatchConfig(data: DbDispatchConfig): DispatchAlgorithmConfig {
    return {
      id: data.id,
      weightProximity: data.weight_proximity,
      weightSkills: data.weight_skills,
      weightWorkload: data.weight_workload,
      weightRating: data.weight_rating,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
    };
  }

  private mapToHistoryEntry(data: DbConfigHistory): ConfigurationHistoryEntry {
    return {
      id: data.id,
      tableName: data.table_name,
      recordId: data.record_id,
      fieldName: data.field_name,
      oldValue: data.old_value,
      newValue: data.new_value,
      changedBy: data.changed_by,
      changedAt: data.changed_at,
      changeReason: data.change_reason,
    };
  }
}

export const configurationService = new ConfigurationService();

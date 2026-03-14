import type { ISiteSettingsService, SiteSetting } from '@/services/interfaces/site-settings.interface';
import { supabase } from '@/integrations/supabase/client';

function mapRow(row: any): SiteSetting {
  return {
    id: row.id,
    settingKey: row.setting_key,
    settingValue: row.setting_value,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class SupabaseSiteSettingsService implements ISiteSettingsService {
  async getAllSettings(): Promise<SiteSetting[]> {
    const { data, error } = await supabase.from('site_settings').select('*');
    if (error) throw error;
    return (data || []).map(mapRow);
  }

  async getSetting(key: string): Promise<SiteSetting | null> {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('setting_key', key)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : null;
  }

  async updateSetting(key: string, value: string): Promise<SiteSetting> {
    const { data, error } = await supabase
      .from('site_settings')
      .update({ setting_value: value })
      .eq('setting_key', key)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  }
}

export const siteSettingsService = new SupabaseSiteSettingsService();

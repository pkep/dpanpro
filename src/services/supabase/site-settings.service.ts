import { supabase } from '@/integrations/supabase/client';
import type { ISiteSettingsService, SiteSetting } from '@/services/interfaces/site-settings.interface';

// Table `site_settings` absente/divergente des types Supabase générés → client non typé.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface SiteSettingRow {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
  updated_at: string;
}

function fromRow(row: SiteSettingRow): SiteSetting {
  return {
    id: row.id,
    key: row.setting_key,
    value: row.setting_value,
    description: row.description ?? undefined,
    updatedAt: row.updated_at,
  };
}

class SupabaseSiteSettingsService implements ISiteSettingsService {
  async getAllSettings(): Promise<SiteSetting[]> {
    const { data, error } = await db
      .from('site_settings')
      .select('*');
    if (error) throw error;
    return ((data || []) as SiteSettingRow[]).map(fromRow);
  }

  async getSetting(key: string): Promise<SiteSetting | null> {
    const { data, error } = await db
      .from('site_settings')
      .select('*')
      .eq('setting_key', key)
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as SiteSettingRow) : null;
  }

  async updateSetting(key: string, value: unknown): Promise<void> {
    const { error } = await db
      .from('site_settings')
      .upsert(
        {
          setting_key: key,
          setting_value: String(value),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'setting_key' }
      );
    if (error) throw error;
  }

  async updateSettings(settings: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.updateSetting(key, value);
    }
  }

  async getSettingsByCategory(_category: string): Promise<SiteSetting[]> {
    return this.getAllSettings();
  }

  async deleteSetting(key: string): Promise<void> {
    const { error } = await db
      .from('site_settings')
      .delete()
      .eq('setting_key', key);
    if (error) throw error;
  }
}

export const supabaseSiteSettingsService = new SupabaseSiteSettingsService();

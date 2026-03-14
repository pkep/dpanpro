import type { ISiteSettingsService, SiteSetting } from '@/services/interfaces/site-settings.interface';
import { springHttp } from './http-client';

export class SpringSiteSettingsService implements ISiteSettingsService {
  // GET /settings
  async getAllSettings(): Promise<SiteSetting[]> {
    return springHttp.get<SiteSetting[]>('/settings');
  }

  // GET /settings/{key}
  async getSetting(key: string): Promise<SiteSetting | null> {
    return springHttp.get<SiteSetting | null>(`/settings/${key}`);
  }

  // PATCH /settings/{key}
  async updateSetting(key: string, value: string): Promise<SiteSetting> {
    return springHttp.patch<SiteSetting>(`/settings/${key}`, { value });
  }
}

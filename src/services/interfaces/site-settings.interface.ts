export interface SiteSetting {
  id: string;
  settingKey: string;
  settingValue: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ISiteSettingsService {
  getAllSettings(): Promise<SiteSetting[]>;
  getSetting(key: string): Promise<SiteSetting | null>;
  updateSetting(key: string, value: string): Promise<SiteSetting>;
}

/**
 * Réglage du site (table `site_settings`).
 * Colonnes réelles : id, setting_key, setting_value, description, created_at, updated_at.
 */
export interface SiteSetting {
  id: string;
  /** Colonne `setting_key`. */
  key: string;
  /** Colonne `setting_value`. */
  value: string;
  description?: string;
  /** Colonne `updated_at`. */
  updatedAt: string;
}

export interface ISiteSettingsService {
  getAllSettings(): Promise<SiteSetting[]>;
  getSetting(key: string): Promise<SiteSetting | null>;
  /** Crée ou met à jour un réglage (upsert sur la clé). */
  updateSetting(key: string, value: unknown): Promise<void>;
}

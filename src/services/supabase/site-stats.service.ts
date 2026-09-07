import { supabase } from '@/integrations/supabase/client';
import type { ISiteStatsService, SiteStats } from '@/services/interfaces/site-stats.interface';

class SupabaseSiteStatsService implements ISiteStatsService {
  async getSiteStats(params: { period?: string; from?: string; to?: string }): Promise<SiteStats> {
    const { data, error } = await supabase.functions.invoke('site-stats', {
      body: {
        period: params.period,
        from: params.from,
        to: params.to,
      },
    });

    if (error) throw error;
    return data as SiteStats;
  }
}

export const siteStatsService = new SupabaseSiteStatsService();

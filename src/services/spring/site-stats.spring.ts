import { springHttp } from './http-client';
import type { ISiteStatsService, SiteStats } from '@/services/interfaces/site-stats.interface';

export class SpringSiteStatsService implements ISiteStatsService {
  async getSiteStats(params: { period?: string; from?: string; to?: string }): Promise<SiteStats> {
    const query: Record<string, string> = {};
    if (params.period) query.period = params.period;
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    return springHttp.get<SiteStats>('/site-stats', query);
  }
}

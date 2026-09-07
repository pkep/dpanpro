export interface SiteStatsDailyPoint { date: string; sessions: number; }
export interface SiteStatsSlice { label: string; value: number; }

export interface SiteStats {
  sessionsOverTime: SiteStatsDailyPoint[];
  newInterventionViews: number;
  newInterventionUsers: number;
  acquisition: SiteStatsSlice[];
  avgSessionDurationSeconds: number;
  avgPagesPerSession: number;
  newVsReturning: SiteStatsSlice[];
  byDevice: SiteStatsSlice[];
  period: string;
  from: string;
  to: string;
}

export interface ISiteStatsService {
  getSiteStats(params: { period?: string; from?: string; to?: string }): Promise<SiteStats>;
}

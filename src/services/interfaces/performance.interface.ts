import type { TechnicianPerformance, PerformanceTrend, ZoneStats, PeriodType } from '@/services/performance/performance.service';

export interface IPerformanceService {
  getTechnicianPerformances(period: PeriodType): Promise<TechnicianPerformance[]>;
  getPerformanceTrends(days?: number): Promise<PerformanceTrend[]>;
  getInterventionZones(): Promise<ZoneStats[]>;
  getTopTechnicians(limit?: number): Promise<TechnicianPerformance[]>;
}

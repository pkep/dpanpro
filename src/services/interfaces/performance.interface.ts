import type { TechnicianPerformance, PerformanceTrend, ZoneStats, DateRange } from '@/services/supabase/performance.service';

export interface IPerformanceService {
  getTechnicianPerformances(dateRange: DateRange): Promise<TechnicianPerformance[]>;
  getPerformanceTrends(dateRange: DateRange): Promise<PerformanceTrend[]>;
  getInterventionZones(dateRange?: DateRange): Promise<ZoneStats[]>;
  getTopTechnicians(limit?: number, dateRange?: DateRange): Promise<TechnicianPerformance[]>;
}

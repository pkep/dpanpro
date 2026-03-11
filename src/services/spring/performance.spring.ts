import type { IPerformanceService } from '@/services/interfaces/performance.interface';
import type { TechnicianPerformance, PerformanceTrend, ZoneStats, PeriodType } from '@/services/supabase/performance.service';
import { springHttp } from './http-client';

export class SpringPerformanceService implements IPerformanceService {
  // GET /performance/technicians?period=
  async getTechnicianPerformances(period: PeriodType): Promise<TechnicianPerformance[]> {
    return springHttp.get('/performance/technicians', { period });
  }

  // GET /performance/trends?days=
  async getPerformanceTrends(days?: number): Promise<PerformanceTrend[]> {
    const params: Record<string, string> = {};
    if (days) params.days = String(days);
    return springHttp.get('/performance/trends', params);
  }

  // GET /performance/zones
  async getInterventionZones(): Promise<ZoneStats[]> {
    return springHttp.get('/performance/zones');
  }

  // GET /performance/top-technicians?limit=
  async getTopTechnicians(limit?: number): Promise<TechnicianPerformance[]> {
    const params: Record<string, string> = {};
    if (limit) params.limit = String(limit);
    return springHttp.get('/performance/top-technicians', params);
  }
}

import type { IPerformanceService } from '@/services/interfaces/performance.interface';
import type { TechnicianPerformance, PerformanceTrend, ZoneStats, DateRange } from '@/services/supabase/performance.service';
import { springHttp } from './http-client';

export class SpringPerformanceService implements IPerformanceService {
  async getTechnicianPerformances(dateRange: DateRange): Promise<TechnicianPerformance[]> {
    return springHttp.get('/performance/technicians', {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
    });
  }

  async getPerformanceTrends(dateRange: DateRange): Promise<PerformanceTrend[]> {
    return springHttp.get('/performance/trends', {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
    });
  }

  async getInterventionZones(dateRange?: DateRange): Promise<ZoneStats[]> {
    const params: Record<string, string> = {};
    if (dateRange) {
      params.startDate = dateRange.startDate.toISOString();
      params.endDate = dateRange.endDate.toISOString();
    }
    return springHttp.get('/performance/zones', params);
  }

  async getTopTechnicians(limit?: number, dateRange?: DateRange): Promise<TechnicianPerformance[]> {
    const params: Record<string, string> = {};
    if (limit) params.limit = String(limit);
    if (dateRange) {
      params.startDate = dateRange.startDate.toISOString();
      params.endDate = dateRange.endDate.toISOString();
    }
    return springHttp.get('/performance/top-technicians', params);
  }
}

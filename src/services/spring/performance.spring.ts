import type { IPerformanceService } from '@/services/interfaces/performance.interface';
import type { TechnicianPerformance, PerformanceTrend, ZoneStats, PeriodType } from '@/services/performance/performance.service';
import { springHttp } from './http-client';

export class SpringPerformanceService implements IPerformanceService {
  async getTechnicianPerformances(period: PeriodType): Promise<TechnicianPerformance[]> {
    return springHttp.get('/performance/technicians', { period });
  }
  async getPerformanceTrends(days?: number): Promise<PerformanceTrend[]> {
    const params: Record<string, string> = {};
    if (days) params.days = String(days);
    return springHttp.get('/performance/trends', params);
  }
  async getInterventionZones(): Promise<ZoneStats[]> { return springHttp.get('/performance/zones'); }
  async getTopTechnicians(limit?: number): Promise<TechnicianPerformance[]> {
    const params: Record<string, string> = {};
    if (limit) params.limit = String(limit);
    return springHttp.get('/performance/top', params);
  }
}

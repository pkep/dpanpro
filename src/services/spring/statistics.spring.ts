import type { IStatisticsService } from '@/services/interfaces/statistics.interface';
import type { DailyStats, CategoryStats, StatusStats, PerformanceStats, TechnicianStats } from '@/services/statistics/statistics.service';
import { springHttp } from './http-client';

export class SpringStatisticsService implements IStatisticsService {
  async getDailyStats(days?: number): Promise<DailyStats[]> {
    const params: Record<string, string> = {};
    if (days) params.days = String(days);
    return springHttp.get('/statistics/daily', params);
  }
  async getCategoryStats(): Promise<CategoryStats[]> { return springHttp.get('/statistics/categories'); }
  async getStatusStats(): Promise<StatusStats[]> { return springHttp.get('/statistics/statuses'); }
  async getPerformanceStats(): Promise<PerformanceStats> { return springHttp.get('/statistics/performance'); }
  async getTechnicianStats(): Promise<TechnicianStats[]> { return springHttp.get('/statistics/technicians'); }
}

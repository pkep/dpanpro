import type { IStatisticsService } from '@/services/interfaces/statistics.interface';
import type { DailyStats, CategoryStats, StatusStats, PerformanceStats, TechnicianStats } from '@/services/supabase/statistics.service';
import { springHttp } from './http-client';

export class SpringStatisticsService implements IStatisticsService {
  // GET /statistics/daily?days=
  async getDailyStats(days?: number): Promise<DailyStats[]> {
    const params: Record<string, string> = {};
    if (days) params.days = String(days);
    return springHttp.get('/statistics/daily', params);
  }

  // GET /statistics/categories
  async getCategoryStats(): Promise<CategoryStats[]> {
    return springHttp.get('/statistics/categories');
  }

  // GET /statistics/statuses
  async getStatusStats(): Promise<StatusStats[]> {
    return springHttp.get('/statistics/statuses');
  }

  // GET /statistics/performance
  async getPerformanceStats(): Promise<PerformanceStats> {
    return springHttp.get('/statistics/performance');
  }

  // GET /statistics/technicians
  async getTechnicianStats(): Promise<TechnicianStats[]> {
    return springHttp.get('/statistics/technicians');
  }
}

import type { DailyStats, CategoryStats, StatusStats, PerformanceStats, TechnicianStats } from '@/services/statistics/statistics.service';

export interface IStatisticsService {
  getDailyStats(days?: number): Promise<DailyStats[]>;
  getCategoryStats(): Promise<CategoryStats[]>;
  getStatusStats(): Promise<StatusStats[]>;
  getPerformanceStats(): Promise<PerformanceStats>;
  getTechnicianStats(): Promise<TechnicianStats[]>;
}

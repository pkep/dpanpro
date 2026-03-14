export interface DailyStats {
  date: string;
  created: number;
  completed: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

export interface StatusStats {
  status: string;
  count: number;
  percentage: number;
}

export interface StatisticsPerformanceStats {
  avgResolutionTimeMinutes: number;
  avgResolutionTimeFormatted: string;
  totalInterventions: number;
  completedInterventions: number;
  completionRate: number;
  urgentInterventions: number;
  urgentCompletionRate: number;
}

export interface TechnicianStats {
  id: string;
  name: string;
  completed: number;
  inProgress: number;
  avgResolutionMinutes: number;
}

export interface IStatisticsService {
  getDailyStats(days?: number): Promise<DailyStats[]>;
  getCategoryStats(): Promise<CategoryStats[]>;
  getStatusStats(): Promise<StatusStats[]>;
  getPerformanceStats(): Promise<StatisticsPerformanceStats>;
  getTechnicianStats(): Promise<TechnicianStats[]>;
}

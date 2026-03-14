export interface TechnicianPerformance {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  totalInterventions: number;
  completedInterventions: number;
  revenue: number;
  avgResponseTimeSeconds: number | null;
  avgArrivalTimeSeconds: number | null;
  avgRating: number | null;
  acceptanceRate: number;
}

export interface PerformanceTrend {
  date: string;
  avgResponseTime: number;
  resolutionRate: number;
  avgSatisfaction: number;
}

export interface ZoneStats {
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
  count: number;
}

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface IPerformanceService {
  getTechnicianPerformances(dateRange: DateRange): Promise<TechnicianPerformance[]>;
  getPerformanceTrends(dateRange: DateRange): Promise<PerformanceTrend[]>;
  getInterventionZones(dateRange?: DateRange): Promise<ZoneStats[]>;
  getTopTechnicians(limit?: number, dateRange?: DateRange): Promise<TechnicianPerformance[]>;
}

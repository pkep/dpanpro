import type { RevenueStats, WeeklyStats, PerformanceStats, PaymentPeriod, MonthlyPayout } from '@/services/revenue/revenue.service';

export interface IRevenueService {
  getRevenueStats(technicianId: string): Promise<RevenueStats>;
  getWeeklyStats(technicianId: string): Promise<WeeklyStats>;
  getPerformanceStats(technicianId: string): Promise<PerformanceStats>;
  getCommissionRate(technicianId: string): Promise<number>;
  getPaymentPeriods(technicianId: string): Promise<PaymentPeriod[]>;
  getMonthlyPayout(technicianId: string): Promise<MonthlyPayout | null>;
  getPayoutHistory(technicianId: string): Promise<MonthlyPayout[]>;
  getInsuranceExpiryDate(technicianId: string): Promise<Date | null>;
}

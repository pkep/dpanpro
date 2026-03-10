import type { IRevenueService } from '@/services/interfaces/revenue.interface';
import type { RevenueStats, WeeklyStats, PerformanceStats, PaymentPeriod, MonthlyPayout } from '@/services/revenue/revenue.service';
import { springHttp } from './http-client';

export class SpringRevenueService implements IRevenueService {
  async getRevenueStats(technicianId: string): Promise<RevenueStats> {
    return springHttp.get(`/revenue/${technicianId}/stats`);
  }
  async getWeeklyStats(technicianId: string): Promise<WeeklyStats> {
    return springHttp.get(`/revenue/${technicianId}/weekly`);
  }
  async getPerformanceStats(technicianId: string): Promise<PerformanceStats> {
    return springHttp.get(`/revenue/${technicianId}/performance`);
  }
  async getCommissionRate(technicianId: string): Promise<number> {
    const r = await springHttp.get<{ rate: number }>(`/revenue/${technicianId}/commission`);
    return r.rate;
  }
  async getPaymentPeriods(technicianId: string): Promise<PaymentPeriod[]> {
    return springHttp.get(`/revenue/${technicianId}/payment-periods`);
  }
  async getMonthlyPayout(technicianId: string): Promise<MonthlyPayout | null> {
    return springHttp.get(`/revenue/${technicianId}/monthly-payout`);
  }
  async getPayoutHistory(technicianId: string): Promise<MonthlyPayout[]> {
    return springHttp.get(`/revenue/${technicianId}/payout-history`);
  }
  async getInsuranceExpiryDate(technicianId: string): Promise<Date | null> {
    const r = await springHttp.get<{ date: string | null }>(`/revenue/${technicianId}/insurance-expiry`);
    return r.date ? new Date(r.date) : null;
  }
}

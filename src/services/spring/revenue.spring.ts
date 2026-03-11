import type { IRevenueService } from '@/services/interfaces/revenue.interface';
import type { RevenueStats, WeeklyStats, PerformanceStats, PaymentPeriod, MonthlyPayout } from '@/services/revenue/revenue.service';
import { springHttp } from './http-client';

export class SpringRevenueService implements IRevenueService {
  // GET /technicians/{id}/revenue/stats
  async getRevenueStats(technicianId: string): Promise<RevenueStats> {
    return springHttp.get(`/technicians/${technicianId}/revenue/stats`);
  }

  // GET /technicians/{id}/revenue/weekly
  async getWeeklyStats(technicianId: string): Promise<WeeklyStats> {
    return springHttp.get(`/technicians/${technicianId}/revenue/weekly`);
  }

  // GET /technicians/{id}/revenue/performance
  async getPerformanceStats(technicianId: string): Promise<PerformanceStats> {
    return springHttp.get(`/technicians/${technicianId}/revenue/performance`);
  }

  // GET /technicians/{id}/revenue/commission-rate
  async getCommissionRate(technicianId: string): Promise<number> {
    const r = await springHttp.get<{ rate: number }>(`/technicians/${technicianId}/revenue/commission-rate`);
    return r.rate;
  }

  // GET /technicians/{id}/revenue/payment-periods
  async getPaymentPeriods(technicianId: string): Promise<PaymentPeriod[]> {
    return springHttp.get(`/technicians/${technicianId}/revenue/payment-periods`);
  }

  // Monthly payout from payout-history
  async getMonthlyPayout(technicianId: string): Promise<MonthlyPayout | null> {
    const history = await this.getPayoutHistory(technicianId);
    return history.length > 0 ? history[0] : null;
  }

  // GET /technicians/{id}/revenue/payout-history
  async getPayoutHistory(technicianId: string): Promise<MonthlyPayout[]> {
    return springHttp.get(`/technicians/${technicianId}/revenue/payout-history`);
  }

  async getInsuranceExpiryDate(technicianId: string): Promise<Date | null> {
    // Not a dedicated revenue endpoint; fetch from partner profile
    const profile = await springHttp.get<{ insuranceExpiryDate?: string | null }>(`/partners/profile/${technicianId}`);
    return profile?.insuranceExpiryDate ? new Date(profile.insuranceExpiryDate) : null;
  }
}

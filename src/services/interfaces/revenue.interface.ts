export interface RevenueStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export interface WeeklyStats {
  grossRevenue: number;
  missionsCount: number;
  percentageChange: number | null;
}

export interface PerformanceStats {
  completedMissions: number;
  acceptanceRate: number;
  averageRating: number | null;
}

export interface PaymentPeriod {
  startDate: Date;
  endDate: Date;
  grossRevenue: number;
  commissionRate: number;
  netRevenue: number;
  paymentDate: Date;
  isPaid: boolean;
}

export interface MonthlyPayout {
  periodStart: Date;
  periodEnd: Date;
  grossRevenue: number;
  commissionRate: number;
  netRevenue: number;
  scheduledPaymentDate: Date;
  isPaid: boolean;
  paidAt: Date | null;
}

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

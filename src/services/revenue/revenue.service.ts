import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, format, lastDayOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

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

class RevenueService {
  async getRevenueStats(technicianId: string): Promise<RevenueStats> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Get all completed interventions for this technician
    const { data: interventions, error } = await supabase
      .from('interventions')
      .select('final_price, completed_at')
      .eq('technician_id', technicianId)
      .eq('status', 'completed')
      .not('final_price', 'is', null);

    if (error) throw error;

    let today = 0;
    let thisWeek = 0;
    let thisMonth = 0;

    interventions?.forEach(i => {
      const completedAt = new Date(i.completed_at);
      const price = Number(i.final_price) || 0;

      if (completedAt >= todayStart && completedAt <= todayEnd) {
        today += price;
      }
      if (completedAt >= weekStart && completedAt <= weekEnd) {
        thisWeek += price;
      }
      if (completedAt >= monthStart && completedAt <= monthEnd) {
        thisMonth += price;
      }
    });

    return { today, thisWeek, thisMonth };
  }

  async getWeeklyStats(technicianId: string): Promise<WeeklyStats> {
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    // Get this week's interventions
    const { data: thisWeekInterventions, error: thisWeekError } = await supabase
      .from('interventions')
      .select('final_price')
      .eq('technician_id', technicianId)
      .eq('status', 'completed')
      .gte('completed_at', thisWeekStart.toISOString())
      .lte('completed_at', thisWeekEnd.toISOString());

    if (thisWeekError) throw thisWeekError;

    // Get last week's interventions
    const { data: lastWeekInterventions, error: lastWeekError } = await supabase
      .from('interventions')
      .select('final_price')
      .eq('technician_id', technicianId)
      .eq('status', 'completed')
      .gte('completed_at', lastWeekStart.toISOString())
      .lte('completed_at', lastWeekEnd.toISOString());

    if (lastWeekError) throw lastWeekError;

    const thisWeekRevenue = thisWeekInterventions?.reduce((sum, i) => sum + (Number(i.final_price) || 0), 0) || 0;
    const lastWeekRevenue = lastWeekInterventions?.reduce((sum, i) => sum + (Number(i.final_price) || 0), 0) || 0;
    const missionsCount = thisWeekInterventions?.length || 0;

    let percentageChange: number | null = null;
    if (lastWeekRevenue > 0) {
      percentageChange = Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100);
    } else if (thisWeekRevenue > 0) {
      percentageChange = 100;
    }

    return {
      grossRevenue: thisWeekRevenue,
      missionsCount,
      percentageChange,
    };
  }

  async getPerformanceStats(technicianId: string): Promise<PerformanceStats> {
    // Get completed missions count
    const { data: completedInterventions, error: completedError } = await supabase
      .from('interventions')
      .select('id')
      .eq('technician_id', technicianId)
      .eq('status', 'completed');

    if (completedError) throw completedError;

    // Get dispatch attempts to calculate acceptance rate
    const { data: dispatchAttempts, error: dispatchError } = await supabase
      .from('dispatch_attempts')
      .select('status')
      .eq('technician_id', technicianId);

    if (dispatchError) throw dispatchError;

    const totalAttempts = dispatchAttempts?.length || 0;
    const acceptedAttempts = dispatchAttempts?.filter(a => a.status === 'accepted').length || 0;
    const acceptanceRate = totalAttempts > 0 ? Math.round((acceptedAttempts / totalAttempts) * 100) : 100;

    // Get average rating from partner_statistics
    const { data: stats, error: statsError } = await supabase
      .from('partner_statistics')
      .select('average_rating')
      .eq('partner_id', technicianId)
      .single();

    const averageRating = !statsError && stats?.average_rating ? Number(stats.average_rating) : null;

    return {
      completedMissions: completedInterventions?.length || 0,
      acceptanceRate,
      averageRating,
    };
  }

  async getCommissionRate(technicianId: string): Promise<number> {
    // First try to get technician-specific rate
    const { data: specificRate, error: specificError } = await supabase
      .from('commission_settings')
      .select('commission_rate')
      .eq('partner_id', technicianId)
      .single();

    if (!specificError && specificRate) {
      return Number(specificRate.commission_rate);
    }

    // Fall back to global default rate
    const { data: globalRate, error: globalError } = await supabase
      .from('commission_settings')
      .select('commission_rate')
      .is('partner_id', null)
      .single();

    if (!globalError && globalRate) {
      return Number(globalRate.commission_rate);
    }

    // Default to 15% if nothing configured
    return 15;
  }

  async getPaymentPeriods(technicianId: string): Promise<PaymentPeriod[]> {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    const commissionRate = await this.getCommissionRate(technicianId);

    const periods: PaymentPeriod[] = [];

    if (currentDay <= 15) {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonthLastDay = lastDayOfMonth(new Date(prevYear, prevMonth, 1));
      
      const period1Start = new Date(prevYear, prevMonth, 16);
      const period1End = prevMonthLastDay;
      const period1PaymentDate = new Date(currentYear, currentMonth, 5);

      const period1Revenue = await this.getPeriodRevenue(technicianId, period1Start, period1End);
      const period1Net = period1Revenue * (1 - commissionRate / 100);

      periods.push({
        startDate: period1Start,
        endDate: period1End,
        grossRevenue: period1Revenue,
        commissionRate,
        netRevenue: period1Net,
        paymentDate: period1PaymentDate,
        isPaid: currentDay >= 5,
      });

      const period2Start = new Date(currentYear, currentMonth, 1);
      const period2End = new Date(currentYear, currentMonth, 15);
      const period2PaymentDate = new Date(currentYear, currentMonth, 20);

      const period2Revenue = await this.getPeriodRevenue(technicianId, period2Start, period2End);
      const period2Net = period2Revenue * (1 - commissionRate / 100);

      periods.push({
        startDate: period2Start,
        endDate: period2End,
        grossRevenue: period2Revenue,
        commissionRate,
        netRevenue: period2Net,
        paymentDate: period2PaymentDate,
        isPaid: false,
      });
    } else {
      const period1Start = new Date(currentYear, currentMonth, 1);
      const period1End = new Date(currentYear, currentMonth, 15);
      const period1PaymentDate = new Date(currentYear, currentMonth, 20);

      const period1Revenue = await this.getPeriodRevenue(technicianId, period1Start, period1End);
      const period1Net = period1Revenue * (1 - commissionRate / 100);

      periods.push({
        startDate: period1Start,
        endDate: period1End,
        grossRevenue: period1Revenue,
        commissionRate,
        netRevenue: period1Net,
        paymentDate: period1PaymentDate,
        isPaid: currentDay >= 20,
      });

      const period2Start = new Date(currentYear, currentMonth, 16);
      const period2End = lastDayOfMonth(now);
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const period2PaymentDate = new Date(nextYear, nextMonth, 5);

      const period2Revenue = await this.getPeriodRevenue(technicianId, period2Start, period2End);
      const period2Net = period2Revenue * (1 - commissionRate / 100);

      periods.push({
        startDate: period2Start,
        endDate: period2End,
        grossRevenue: period2Revenue,
        commissionRate,
        netRevenue: period2Net,
        paymentDate: period2PaymentDate,
        isPaid: false,
      });
    }

    return periods;
  }

  async getMonthlyPayout(technicianId: string): Promise<MonthlyPayout | null> {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Previous month period (1st to last day)
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const periodStart = new Date(prevYear, prevMonth, 1);
    const periodEnd = lastDayOfMonth(periodStart);

    // Scheduled payment date is 1st of current month
    const scheduledPaymentDate = new Date(currentYear, currentMonth, 1);

    // Check if there's an actual payout record from admin/manager
    const { data: payoutRecord, error } = await supabase
      .from('technician_payouts')
      .select('*')
      .eq('technician_id', technicianId)
      .gte('period_start', periodStart.toISOString().split('T')[0])
      .lte('period_end', periodEnd.toISOString().split('T')[0])
      .maybeSingle();

    if (error) {
      console.error('Error fetching payout record:', error);
    }

    const commissionRate = await this.getCommissionRate(technicianId);

    // If a payout record exists, use its data
    if (payoutRecord) {
      return {
        periodStart: new Date(payoutRecord.period_start),
        periodEnd: new Date(payoutRecord.period_end),
        grossRevenue: Number(payoutRecord.amount) / (1 - commissionRate / 100), // Reverse calculate gross
        commissionRate,
        netRevenue: Number(payoutRecord.amount),
        scheduledPaymentDate: new Date(payoutRecord.payout_date),
        isPaid: payoutRecord.status === 'paid',
        paidAt: payoutRecord.status === 'paid' ? new Date(payoutRecord.updated_at) : null,
      };
    }

    // Otherwise, calculate from interventions
    const grossRevenue = await this.getPeriodRevenue(technicianId, periodStart, periodEnd);
    const netRevenue = grossRevenue * (1 - commissionRate / 100);

    return {
      periodStart,
      periodEnd,
      grossRevenue,
      commissionRate,
      netRevenue,
      scheduledPaymentDate,
      isPaid: false,
      paidAt: null,
    };
  }

  private async getPeriodRevenue(technicianId: string, startDate: Date, endDate: Date): Promise<number> {
    const { data, error } = await supabase
      .from('interventions')
      .select('final_price')
      .eq('technician_id', technicianId)
      .eq('status', 'completed')
      .gte('completed_at', startOfDay(startDate).toISOString())
      .lte('completed_at', endOfDay(endDate).toISOString());

    if (error) throw error;

    return data?.reduce((sum, i) => sum + (Number(i.final_price) || 0), 0) || 0;
  }

  async getInsuranceExpiryDate(technicianId: string): Promise<Date | null> {
    const { data, error } = await supabase
      .from('partner_applications')
      .select('insurance_expiry_date')
      .eq('user_id', technicianId)
      .single();

    if (error || !data?.insurance_expiry_date) return null;
    
    return new Date(data.insurance_expiry_date);
  }
}

export const revenueService = new RevenueService();

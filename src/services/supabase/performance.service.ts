import { supabase } from '@/integrations/supabase/client';
import { subDays, subMonths, subYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

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

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';

class PerformanceService {
  async getTechnicianPerformances(period: PeriodType): Promise<TechnicianPerformance[]> {
    const { startDate, endDate } = this.getDateRange(period);

    // Get approved technicians
    const { data: partners, error: partnersError } = await supabase
      .from('partner_applications')
      .select('user_id')
      .eq('status', 'approved')
      .not('user_id', 'is', null);

    if (partnersError) throw partnersError;

    const technicianIds = partners?.map(p => p.user_id).filter(Boolean) || [];
    if (technicianIds.length === 0) return [];

    // Get technician info
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, company_name')
      .in('id', technicianIds);

    if (usersError) throw usersError;

    // Get interventions for period
    const { data: interventions, error: intervError } = await supabase
      .from('interventions')
      .select('*')
      .in('technician_id', technicianIds)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (intervError) throw intervError;

    // Get dispatch attempts for acceptance rate
    const { data: dispatchAttempts, error: dispatchError } = await supabase
      .from('dispatch_attempts')
      .select('technician_id, status')
      .in('technician_id', technicianIds)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (dispatchError) throw dispatchError;

    // Get partner statistics for ratings
    const { data: statistics, error: statsError } = await supabase
      .from('partner_statistics')
      .select('partner_id, average_rating, average_response_time_seconds, average_arrival_time_seconds')
      .in('partner_id', technicianIds);

    if (statsError) throw statsError;

    const statsMap = new Map(statistics?.map(s => [s.partner_id, s]) || []);

    // Calculate performances
    const performances: TechnicianPerformance[] = (users || []).map(user => {
      const userInterventions = interventions?.filter(i => i.technician_id === user.id) || [];
      const completed = userInterventions.filter(i => i.status === 'completed');
      const revenue = completed.reduce((sum, i) => sum + (i.final_price || 0), 0);

      const userAttempts = dispatchAttempts?.filter(a => a.technician_id === user.id) || [];
      const acceptedAttempts = userAttempts.filter(a => a.status === 'accepted').length;
      const totalAttempts = userAttempts.length;

      const stats = statsMap.get(user.id);

      return {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        companyName: user.company_name,
        totalInterventions: userInterventions.length,
        completedInterventions: completed.length,
        revenue,
        avgResponseTimeSeconds: stats?.average_response_time_seconds || null,
        avgArrivalTimeSeconds: stats?.average_arrival_time_seconds || null,
        avgRating: stats?.average_rating || null,
        acceptanceRate: totalAttempts > 0 ? (acceptedAttempts / totalAttempts) * 100 : 0,
      };
    });

    return performances;
  }

  async getPerformanceTrends(days: number = 30): Promise<PerformanceTrend[]> {
    const startDate = subDays(new Date(), days);

    const { data: interventions, error } = await supabase
      .from('interventions')
      .select('created_at, status, response_time_seconds, technician_id')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // Get ratings
    const { data: ratings, error: ratingsError } = await supabase
      .from('intervention_ratings')
      .select('rating, created_at')
      .gte('created_at', startDate.toISOString());

    if (ratingsError) throw ratingsError;

    // Group by date
    const dateMap = new Map<string, { responseTimes: number[], completed: number, total: number, ratings: number[] }>();

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      dateMap.set(date, { responseTimes: [], completed: 0, total: 0, ratings: [] });
    }

    interventions?.forEach(i => {
      const date = format(new Date(i.created_at), 'yyyy-MM-dd');
      const entry = dateMap.get(date);
      if (entry) {
        entry.total++;
        if (i.status === 'completed') entry.completed++;
        if (i.response_time_seconds) entry.responseTimes.push(i.response_time_seconds);
      }
    });

    ratings?.forEach(r => {
      const date = format(new Date(r.created_at), 'yyyy-MM-dd');
      const entry = dateMap.get(date);
      if (entry) {
        entry.ratings.push(r.rating);
      }
    });

    return Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      avgResponseTime: data.responseTimes.length > 0 
        ? Math.round(data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length / 60) 
        : 0,
      resolutionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      avgSatisfaction: data.ratings.length > 0 
        ? Math.round((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) * 10) / 10 
        : 0,
    }));
  }

  async getInterventionZones(): Promise<ZoneStats[]> {
    const { data: interventions, error } = await supabase
      .from('interventions')
      .select('city, postal_code, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) throw error;

    // Group by city
    const zoneMap = new Map<string, ZoneStats>();

    interventions?.forEach(i => {
      if (!i.latitude || !i.longitude) return;
      
      const key = `${i.city}-${i.postal_code}`;
      const existing = zoneMap.get(key);
      
      if (existing) {
        existing.count++;
        // Average the coordinates
        existing.lat = (existing.lat * (existing.count - 1) + i.latitude) / existing.count;
        existing.lng = (existing.lng * (existing.count - 1) + i.longitude) / existing.count;
      } else {
        zoneMap.set(key, {
          city: i.city,
          postalCode: i.postal_code,
          lat: i.latitude,
          lng: i.longitude,
          count: 1,
        });
      }
    });

    return Array.from(zoneMap.values()).sort((a, b) => b.count - a.count);
  }

  async getTopTechnicians(limit: number = 7): Promise<TechnicianPerformance[]> {
    const performances = await this.getTechnicianPerformances('monthly');
    
    // Sort by composite score (revenue + completed interventions + rating)
    return performances
      .sort((a, b) => {
        const scoreA = a.revenue + (a.completedInterventions * 100) + ((a.avgRating || 0) * 200);
        const scoreB = b.revenue + (b.completedInterventions * 100) + ((b.avgRating || 0) * 200);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  private getDateRange(period: PeriodType): { startDate: Date; endDate: Date } {
    const now = new Date();
    
    switch (period) {
      case 'daily':
        return { startDate: startOfDay(now), endDate: endOfDay(now) };
      case 'weekly':
        return { startDate: startOfWeek(now, { weekStartsOn: 1 }), endDate: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'monthly':
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case 'yearly':
        return { startDate: startOfYear(now), endDate: endOfYear(now) };
    }
  }
}

export const performanceService = new PerformanceService();

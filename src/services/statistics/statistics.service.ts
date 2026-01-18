import { supabase } from '@/integrations/supabase/client';
import type { Intervention } from '@/types/intervention.types';
import type { DbIntervention } from '@/types/database.types';
import { subDays, format, differenceInMinutes, startOfDay, endOfDay } from 'date-fns';

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

export interface PerformanceStats {
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

class StatisticsService {
  async getDailyStats(days: number = 30): Promise<DailyStats[]> {
    const startDate = subDays(new Date(), days);
    
    const { data, error } = await supabase
      .from('interventions')
      .select('created_at, completed_at, status')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const interventions = (data || []) as unknown as DbIntervention[];
    
    // Group by date
    const statsMap = new Map<string, DailyStats>();
    
    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      statsMap.set(date, { date, created: 0, completed: 0 });
    }

    interventions.forEach((intervention) => {
      const createdDate = format(new Date(intervention.created_at), 'yyyy-MM-dd');
      if (statsMap.has(createdDate)) {
        statsMap.get(createdDate)!.created++;
      }

      if (intervention.completed_at) {
        const completedDate = format(new Date(intervention.completed_at), 'yyyy-MM-dd');
        if (statsMap.has(completedDate)) {
          statsMap.get(completedDate)!.completed++;
        }
      }
    });

    return Array.from(statsMap.values());
  }

  async getCategoryStats(): Promise<CategoryStats[]> {
    const { data, error } = await supabase
      .from('interventions')
      .select('category');

    if (error) throw error;

    const interventions = (data || []) as unknown as { category: string }[];
    const total = interventions.length;
    
    const categoryCount = new Map<string, number>();
    interventions.forEach((i) => {
      categoryCount.set(i.category, (categoryCount.get(i.category) || 0) + 1);
    });

    return Array.from(categoryCount.entries()).map(([category, count]) => ({
      category,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }

  async getStatusStats(): Promise<StatusStats[]> {
    const { data, error } = await supabase
      .from('interventions')
      .select('status')
      .eq('is_active', true);

    if (error) throw error;

    const interventions = (data || []) as unknown as { status: string }[];
    const total = interventions.length;
    
    const statusCount = new Map<string, number>();
    interventions.forEach((i) => {
      statusCount.set(i.status, (statusCount.get(i.status) || 0) + 1);
    });

    return Array.from(statusCount.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }

  async getPerformanceStats(): Promise<PerformanceStats> {
    const { data, error } = await supabase
      .from('interventions')
      .select('status, priority, created_at, completed_at');

    if (error) throw error;

    const interventions = (data || []) as unknown as DbIntervention[];
    const total = interventions.length;
    const completed = interventions.filter((i) => i.status === 'completed');
    const urgent = interventions.filter((i) => i.priority === 'urgent');
    const urgentCompleted = urgent.filter((i) => i.status === 'completed');

    // Calculate average resolution time
    const completedWithTimes = completed.filter((i) => i.completed_at && i.created_at);
    let totalMinutes = 0;
    
    completedWithTimes.forEach((i) => {
      const created = new Date(i.created_at);
      const completedAt = new Date(i.completed_at!);
      totalMinutes += differenceInMinutes(completedAt, created);
    });

    const avgMinutes = completedWithTimes.length > 0 
      ? Math.round(totalMinutes / completedWithTimes.length) 
      : 0;

    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;

    return {
      avgResolutionTimeMinutes: avgMinutes,
      avgResolutionTimeFormatted: hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`,
      totalInterventions: total,
      completedInterventions: completed.length,
      completionRate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
      urgentInterventions: urgent.length,
      urgentCompletionRate: urgent.length > 0 ? Math.round((urgentCompleted.length / urgent.length) * 100) : 0,
    };
  }

  async getTechnicianStats(): Promise<TechnicianStats[]> {
    // Get all interventions with technicians
    const { data: interventions, error: intError } = await supabase
      .from('interventions')
      .select('technician_id, status, created_at, completed_at')
      .not('technician_id', 'is', null);

    if (intError) throw intError;

    // Get technicians
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'technician');

    if (usersError) throw usersError;

    const techMap = new Map<string, { name: string; completed: number; inProgress: number; totalMinutes: number; completedCount: number }>();
    
    (users || []).forEach((u: any) => {
      techMap.set(u.id, {
        name: `${u.first_name} ${u.last_name}`,
        completed: 0,
        inProgress: 0,
        totalMinutes: 0,
        completedCount: 0,
      });
    });

    ((interventions || []) as unknown as DbIntervention[]).forEach((i) => {
      if (!i.technician_id || !techMap.has(i.technician_id)) return;
      
      const tech = techMap.get(i.technician_id)!;
      
      if (i.status === 'completed') {
        tech.completed++;
        if (i.completed_at) {
          tech.totalMinutes += differenceInMinutes(new Date(i.completed_at), new Date(i.created_at));
          tech.completedCount++;
        }
      } else if (['assigned', 'en_route', 'in_progress'].includes(i.status)) {
        tech.inProgress++;
      }
    });

    return Array.from(techMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      completed: data.completed,
      inProgress: data.inProgress,
      avgResolutionMinutes: data.completedCount > 0 
        ? Math.round(data.totalMinutes / data.completedCount) 
        : 0,
    }));
  }
}

export const statisticsService = new StatisticsService();

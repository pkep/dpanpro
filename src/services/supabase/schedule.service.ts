import { supabase } from '@/integrations/supabase/client';

export interface TechnicianSchedule {
  id: string;
  technicianId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorkingDay: boolean;
}

export interface ScheduleOverride {
  id: string;
  technicianId: string;
  overrideDate: string;
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

class ScheduleService {
  getDayName(dayOfWeek: number): string {
    return DAY_NAMES[dayOfWeek] || '';
  }

  async getSchedule(technicianId: string): Promise<TechnicianSchedule[]> {
    const { data, error } = await supabase
      .from('technician_schedules')
      .select('*')
      .eq('technician_id', technicianId)
      .order('day_of_week');

    if (error) throw error;

    return (data || []).map(s => ({
      id: s.id,
      technicianId: s.technician_id,
      dayOfWeek: s.day_of_week,
      startTime: s.start_time,
      endTime: s.end_time,
      isWorkingDay: s.is_working_day,
    }));
  }

  async initializeDefaultSchedule(technicianId: string): Promise<void> {
    // Create default schedule (Mon-Fri 8:00-18:00)
    const defaultSchedule = [];
    for (let day = 0; day <= 6; day++) {
      defaultSchedule.push({
        technician_id: technicianId,
        day_of_week: day,
        start_time: '08:00:00',
        end_time: '18:00:00',
        is_working_day: day >= 1 && day <= 5, // Mon-Fri
      });
    }

    const { error } = await supabase
      .from('technician_schedules')
      .upsert(defaultSchedule, { onConflict: 'technician_id,day_of_week' });

    if (error) throw error;
  }

  async updateDaySchedule(
    technicianId: string,
    dayOfWeek: number,
    isWorkingDay: boolean,
    startTime: string,
    endTime: string
  ): Promise<void> {
    const { error } = await supabase
      .from('technician_schedules')
      .upsert({
        technician_id: technicianId,
        day_of_week: dayOfWeek,
        is_working_day: isWorkingDay,
        start_time: startTime,
        end_time: endTime,
      }, { onConflict: 'technician_id,day_of_week' });

    if (error) throw error;
  }

  async getOverrides(technicianId: string, startDate: Date, endDate: Date): Promise<ScheduleOverride[]> {
    const { data, error } = await supabase
      .from('technician_schedule_overrides')
      .select('*')
      .eq('technician_id', technicianId)
      .gte('override_date', startDate.toISOString().split('T')[0])
      .lte('override_date', endDate.toISOString().split('T')[0])
      .order('override_date');

    if (error) throw error;

    return (data || []).map(o => ({
      id: o.id,
      technicianId: o.technician_id,
      overrideDate: o.override_date,
      isAvailable: o.is_available,
      startTime: o.start_time,
      endTime: o.end_time,
      reason: o.reason,
    }));
  }

  async setOverride(
    technicianId: string,
    date: Date,
    isAvailable: boolean,
    startTime?: string,
    endTime?: string,
    reason?: string
  ): Promise<void> {
    // Use local date components to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const { error } = await supabase
      .from('technician_schedule_overrides')
      .upsert({
        technician_id: technicianId,
        override_date: dateStr,
        is_available: isAvailable,
        start_time: startTime || null,
        end_time: endTime || null,
        reason: reason || null,
      }, { onConflict: 'technician_id,override_date' });

    if (error) throw error;
  }

  async deleteOverride(overrideId: string): Promise<void> {
    const { error } = await supabase
      .from('technician_schedule_overrides')
      .delete()
      .eq('id', overrideId);

    if (error) throw error;
  }

  // Check if technician is available at a specific datetime
  async isAvailableAt(technicianId: string, datetime: Date): Promise<boolean> {
    const dateStr = datetime.toISOString().split('T')[0];
    const dayOfWeek = datetime.getDay();
    const timeStr = datetime.toTimeString().split(' ')[0];

    // First check for override on this specific date
    const { data: override } = await supabase
      .from('technician_schedule_overrides')
      .select('*')
      .eq('technician_id', technicianId)
      .eq('override_date', dateStr)
      .single();

    if (override) {
      if (!override.is_available) return false;
      if (override.start_time && override.end_time) {
        return timeStr >= override.start_time && timeStr <= override.end_time;
      }
      return true;
    }

    // Fall back to regular schedule
    const { data: schedule } = await supabase
      .from('technician_schedules')
      .select('*')
      .eq('technician_id', technicianId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!schedule) return true; // No schedule set, assume available
    if (!schedule.is_working_day) return false;
    
    return timeStr >= schedule.start_time && timeStr <= schedule.end_time;
  }
}

export const scheduleService = new ScheduleService();

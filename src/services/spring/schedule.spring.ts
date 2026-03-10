import type { IScheduleService } from '@/services/interfaces/schedule.interface';
import type { TechnicianSchedule, ScheduleOverride } from '@/services/schedule/schedule.service';
import { springHttp } from './http-client';

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export class SpringScheduleService implements IScheduleService {
  getDayName(dayOfWeek: number): string { return DAY_NAMES[dayOfWeek] || ''; }
  async getSchedule(technicianId: string): Promise<TechnicianSchedule[]> {
    return springHttp.get(`/schedules/${technicianId}`);
  }
  async initializeDefaultSchedule(technicianId: string): Promise<void> {
    await springHttp.post(`/schedules/${technicianId}/initialize`);
  }
  async updateDaySchedule(technicianId: string, dayOfWeek: number, isWorkingDay: boolean, startTime: string, endTime: string): Promise<void> {
    await springHttp.put(`/schedules/${technicianId}/${dayOfWeek}`, { isWorkingDay, startTime, endTime });
  }
  async getOverrides(technicianId: string, startDate: Date, endDate: Date): Promise<ScheduleOverride[]> {
    return springHttp.get(`/schedules/${technicianId}/overrides`, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
  }
  async setOverride(technicianId: string, date: Date, isAvailable: boolean, startTime?: string, endTime?: string, reason?: string): Promise<void> {
    await springHttp.post(`/schedules/${technicianId}/overrides`, { date: date.toISOString().split('T')[0], isAvailable, startTime, endTime, reason });
  }
  async deleteOverride(overrideId: string): Promise<void> {
    await springHttp.delete(`/schedules/overrides/${overrideId}`);
  }
  async isAvailableAt(technicianId: string, datetime: Date): Promise<boolean> {
    const result = await springHttp.get<{ available: boolean }>(`/schedules/${technicianId}/available`, { datetime: datetime.toISOString() });
    return result.available;
  }
}

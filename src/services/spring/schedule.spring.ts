import type { IScheduleService } from '@/services/interfaces/schedule.interface';
import type { TechnicianSchedule, ScheduleOverride } from '@/services/schedule/schedule.service';
import { springHttp } from './http-client';

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export class SpringScheduleService implements IScheduleService {
  getDayName(dayOfWeek: number): string { return DAY_NAMES[dayOfWeek] || ''; }

  // GET /technicians/{id}/schedule
  async getSchedule(technicianId: string): Promise<TechnicianSchedule[]> {
    return springHttp.get(`/technicians/${technicianId}/schedule`);
  }

  // POST /technicians/{id}/schedule
  async initializeDefaultSchedule(technicianId: string): Promise<void> {
    await springHttp.post(`/technicians/${technicianId}/schedule`);
  }

  // PATCH /technicians/{id}/schedule/days/{dayOfWeek}
  async updateDaySchedule(technicianId: string, dayOfWeek: number, isWorkingDay: boolean, startTime: string, endTime: string): Promise<void> {
    await springHttp.patch(`/technicians/${technicianId}/schedule/days/${dayOfWeek}`, { isWorkingDay, startTime, endTime });
  }

  // GET /technicians/{id}/schedule/overrides?startDate=&endDate=
  async getOverrides(technicianId: string, startDate: Date, endDate: Date): Promise<ScheduleOverride[]> {
    return springHttp.get(`/technicians/${technicianId}/schedule/overrides`, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
  }

  // POST /technicians/{id}/schedule/overrides
  async setOverride(technicianId: string, date: Date, isAvailable: boolean, startTime?: string, endTime?: string, reason?: string): Promise<void> {
    await springHttp.post(`/technicians/${technicianId}/schedule/overrides`, {
      date: date.toISOString().split('T')[0], isAvailable, startTime, endTime, reason,
    });
  }

  // DELETE /technicians/{id}/schedule/overrides/{overrideId}
  async deleteOverride(overrideId: string, technicianId?: string): Promise<void> {
    // Need technicianId for the nested route; fallback if not provided
    if (technicianId) {
      await springHttp.delete(`/technicians/${technicianId}/schedule/overrides/${overrideId}`);
    } else {
      // Attempt flat route as fallback
      await springHttp.delete(`/schedules/overrides/${overrideId}`);
    }
  }

  // GET /technicians/{id}/schedule/available-at?datetime=
  async isAvailableAt(technicianId: string, datetime: Date): Promise<boolean> {
    const result = await springHttp.get<{ available: boolean }>(`/technicians/${technicianId}/schedule/available-at`, {
      datetime: datetime.toISOString(),
    });
    return result.available;
  }
}

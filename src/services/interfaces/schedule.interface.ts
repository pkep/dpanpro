import type { TechnicianSchedule, ScheduleOverride } from '@/services/schedule/schedule.service';

export interface IScheduleService {
  getDayName(dayOfWeek: number): string;
  getSchedule(technicianId: string): Promise<TechnicianSchedule[]>;
  initializeDefaultSchedule(technicianId: string): Promise<void>;
  updateDaySchedule(technicianId: string, dayOfWeek: number, isWorkingDay: boolean, startTime: string, endTime: string): Promise<void>;
  getOverrides(technicianId: string, startDate: Date, endDate: Date): Promise<ScheduleOverride[]>;
  setOverride(technicianId: string, date: Date, isAvailable: boolean, startTime?: string, endTime?: string, reason?: string): Promise<void>;
  deleteOverride(overrideId: string): Promise<void>;
  isAvailableAt(technicianId: string, datetime: Date): Promise<boolean>;
}

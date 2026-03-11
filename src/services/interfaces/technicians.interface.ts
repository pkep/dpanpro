import type { TechnicianWithLocation, NearbyTechnician } from '@/services/supabase/technicians.service';

export interface ITechniciansService {
  updateTechnicianLocation(userId: string, latitude: number, longitude: number, city: string | null, department: string | null): Promise<void>;
  getActiveTechniciansWithLocation(): Promise<TechnicianWithLocation[]>;
  getNearestTechnicians(targetLatitude: number, targetLongitude: number, limit?: number): Promise<NearbyTechnician[]>;
}

import type { ITechniciansService } from '@/services/interfaces/technicians.interface';
import type { TechnicianWithLocation, NearbyTechnician } from '@/services/technicians/technicians.service';
import { springHttp } from './http-client';

export class SpringTechniciansService implements ITechniciansService {
  // PATCH /technicians/{id}/location
  async updateTechnicianLocation(userId: string, latitude: number, longitude: number, city: string | null, department: string | null): Promise<void> {
    await springHttp.patch(`/technicians/${userId}/location`, { latitude, longitude, city, department });
  }

  // GET /technicians/positions
  async getActiveTechniciansWithLocation(): Promise<TechnicianWithLocation[]> {
    return springHttp.get('/technicians/positions');
  }

  // GET /technicians/nearest?latitude=&longitude=&limit=
  async getNearestTechnicians(targetLatitude: number, targetLongitude: number, limit?: number): Promise<NearbyTechnician[]> {
    const params: Record<string, string> = {
      latitude: String(targetLatitude),
      longitude: String(targetLongitude),
    };
    if (limit) params.limit = String(limit);
    return springHttp.get('/technicians/nearest', params);
  }
}

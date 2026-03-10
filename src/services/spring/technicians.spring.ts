import type { ITechniciansService } from '@/services/interfaces/technicians.interface';
import type { TechnicianWithLocation, NearbyTechnician } from '@/services/technicians/technicians.service';
import { springHttp } from './http-client';

export class SpringTechniciansService implements ITechniciansService {
  async updateTechnicianLocation(userId: string, latitude: number, longitude: number, city: string | null, department: string | null): Promise<void> {
    await springHttp.put(`/technicians/${userId}/location`, { latitude, longitude, city, department });
  }
  async getActiveTechniciansWithLocation(): Promise<TechnicianWithLocation[]> {
    return springHttp.get('/technicians/active-with-location');
  }
  async getNearestTechnicians(targetLatitude: number, targetLongitude: number, limit?: number): Promise<NearbyTechnician[]> {
    const params: Record<string, string> = { lat: String(targetLatitude), lng: String(targetLongitude) };
    if (limit) params.limit = String(limit);
    return springHttp.get('/technicians/nearest', params);
  }
}

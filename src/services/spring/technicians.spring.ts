import type { ITechniciansService, TechnicianWithLocation, NearbyTechnician, TechnicianPosition, TechnicianProfile, EnrichedTechnicianLocation, TechnicianWithoutPosition } from '@/services/interfaces/technicians.interface';
import { springHttp } from './http-client';

export class SpringTechniciansService implements ITechniciansService {
  // ── Géolocalisation ──
  async updateTechnicianLocation(userId: string, latitude: number, longitude: number, city: string | null, department: string | null): Promise<void> {
    await springHttp.patch(`/technicians/${userId}/location`, { latitude, longitude, city, department });
  }

  async getActiveTechniciansWithLocation(): Promise<TechnicianWithLocation[]> {
    return springHttp.get('/technicians/positions');
  }

  async getActiveTechniciansWithLocationEnriched(): Promise<EnrichedTechnicianLocation[]> {
    return springHttp.get('/technicians/positions/enriched');
  }

  async getNearestTechnicians(targetLatitude: number, targetLongitude: number, limit?: number): Promise<NearbyTechnician[]> {
    const params: Record<string, string> = {
      latitude: String(targetLatitude),
      longitude: String(targetLongitude),
    };
    if (limit) params.limit = String(limit);
    return springHttp.get('/technicians/nearest', params);
  }

  getTechniciansWithoutPosition(): Promise<TechnicianWithoutPosition[]> {
    return springHttp.get<TechnicianWithoutPosition[]>('/technicians/missing-position');
  }

  remindTechniciansLocation(technicianIds: string[]): Promise<{ sent: number; failed: number; skipped: number }> {
    return springHttp.post('/technicians/missing-position/remind', { technicianIds });
  }

  // ── Profil enrichi ──
  async getTechnicianPosition(technicianId: string): Promise<TechnicianPosition | null> {
    return springHttp.get(`/technicians/${technicianId}/position`);
  }

  async getTechnicianAvatar(technicianId: string): Promise<string | null> {
    return springHttp.get(`/technicians/${technicianId}/avatar`);
  }

  async getTechnicianProfile(technicianId: string): Promise<TechnicianProfile | null> {
    return springHttp.get(`/technicians/${technicianId}/profile`);
  }
}

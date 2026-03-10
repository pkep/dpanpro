import type { IRatingsService } from '@/services/interfaces/ratings.interface';
import type { Rating } from '@/services/ratings/ratings.service';
import { springHttp } from './http-client';

export class SpringRatingsService implements IRatingsService {
  async getRating(interventionId: string): Promise<Rating | null> {
    return springHttp.get(`/ratings/intervention/${interventionId}`);
  }
  async createRating(interventionId: string, clientId: string, rating: number, comment?: string): Promise<Rating> {
    return springHttp.post('/ratings', { interventionId, clientId, rating, comment });
  }
  async updateRating(ratingId: string, rating: number, comment?: string): Promise<Rating> {
    return springHttp.put(`/ratings/${ratingId}`, { rating, comment });
  }
  async getTechnicianAverageRating(technicianId: string): Promise<{ average: number; count: number }> {
    return springHttp.get(`/ratings/technician/${technicianId}/average`);
  }
  async getAllTechniciansRatings(): Promise<Map<string, { average: number; count: number }>> {
    const data = await springHttp.get<Record<string, { average: number; count: number }>>('/ratings/technicians');
    return new Map(Object.entries(data));
  }
}

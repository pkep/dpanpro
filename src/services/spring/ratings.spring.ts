import type { IRatingsService } from '@/services/interfaces/ratings.interface';
import type { Rating } from '@/services/ratings/ratings.service';
import { springHttp } from './http-client';

export class SpringRatingsService implements IRatingsService {
  // GET /interventions/{id}/ratings
  async getRating(interventionId: string): Promise<Rating | null> {
    return springHttp.get(`/interventions/${interventionId}/ratings`);
  }

  // POST /interventions/{id}/ratings (clientId is inferred from auth)
  async createRating(interventionId: string, _clientId: string, rating: number, comment?: string): Promise<Rating> {
    return springHttp.post(`/interventions/${interventionId}/ratings`, { rating, comment });
  }

  // PATCH /ratings/{id}
  async updateRating(ratingId: string, rating: number, comment?: string): Promise<Rating> {
    return springHttp.patch<Rating>(`/ratings/${ratingId}`, { rating, comment });
  }

  // GET /technicians/{id}/ratings/average
  async getTechnicianAverageRating(technicianId: string): Promise<{ average: number; count: number }> {
    return springHttp.get(`/technicians/${technicianId}/ratings/average`);
  }

  async getAllTechniciansRatings(): Promise<Map<string, { average: number; count: number }>> {
    // Not a dedicated endpoint in v2; aggregate client-side or use performance endpoint
    return new Map();
  }
}

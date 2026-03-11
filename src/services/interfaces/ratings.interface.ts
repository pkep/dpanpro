import type { Rating } from '@/services/supabase/ratings.service';

export interface IRatingsService {
  getRating(interventionId: string): Promise<Rating | null>;
  createRating(interventionId: string, clientId: string, rating: number, comment?: string): Promise<Rating>;
  updateRating(ratingId: string, rating: number, comment?: string): Promise<Rating>;
  getTechnicianAverageRating(technicianId: string): Promise<{ average: number; count: number }>;
  getAllTechniciansRatings(): Promise<Map<string, { average: number; count: number }>>;
}

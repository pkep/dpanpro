export interface Rating {
  id: string;
  interventionId: string;
  clientId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IRatingsService {
  getRating(interventionId: string): Promise<Rating | null>;
  createRating(interventionId: string, clientId: string, rating: number, comment?: string): Promise<Rating>;
  updateRating(ratingId: string, rating: number, comment?: string): Promise<Rating>;
  getTechnicianAverageRating(technicianId: string): Promise<{ average: number; count: number }>;
  getAllTechniciansRatings(): Promise<Map<string, { average: number; count: number }>>;
}

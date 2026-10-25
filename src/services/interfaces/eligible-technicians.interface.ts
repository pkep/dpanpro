/**
 * Contrat du service « techniciens éligibles » (onglet Dispatch de l'admin).
 *
 * Le type est volontairement distinct de `EligibleTechnician`
 * (technicians.interface) : celui-ci porte le score détaillé calculé par
 * l'algorithme de dispatch.
 */

export interface GetEligibleParams {
  interventionId: string;
  interventionLatitude: number | null;
  interventionLongitude: number | null;
  /** Catégorie de l'intervention = compétence recherchée. */
  requiredSkill: string;
  limit?: number;
}

export interface EligibleTechnicianScoreBreakdown {
  proximity: number;
  skills: number;
  workload: number;
  rating: number;
}

export interface EligibleTechnician {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  companyName: string | null;
  currentCity: string | null;
  latitude: number | null;
  longitude: number | null;
  skills: string[];
  averageRating: number | null;
  distanceKm: number;
  estimatedArrivalMinutes: number;
  score: number;
  scoreBreakdown: EligibleTechnicianScoreBreakdown;
}

export interface IEligibleTechniciansService {
  getEligibleTechnicians(params: GetEligibleParams): Promise<EligibleTechnician[]>;
}

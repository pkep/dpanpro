// Legacy proxy - réexporte depuis dispatch.service
// Note: getEligibleTechnicians et EligibleTechnician viennent du service dispatch
export {
  dispatchService,
  type DispatchResult,
  type DispatchAttempt,
} from './dispatch.service';

// Re-export avec alias pour compatibilité
export { dispatchService as getEligibleTechnicians } from './dispatch.service';

// Type placeholder pour compatibilité
export interface EligibleTechnician {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  isAvailable: boolean;
  currentInterventionId: string | null;
  score: number;
  distanceKm: number;
  estimatedArrivalMinutes: number;
  rating: number | null;
  completedInterventions: number;
  skills: string[];
}

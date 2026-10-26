
export interface TechnicianWithLocation {
  id: string;
  userId: string;
  companyName: string;
  currentCity: string | null;
  department: string | null;
  latitude: number | null;
  longitude: number | null;
  skills: string[];
  averageRating: number | null;
  totalRatings: number;
  user: {
    firstName: string;
    lastName: string;
  };
}

export interface EnrichedTechnicianLocation {
  id: string;
  userId: string;
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  latitude: number;
  longitude: number;
  currentCity: string | null;
  department: string | null;
  skills: string[];
  averageRating: number | null;
  completedInterventions: number;
  updatedAt: Date;
  hasActiveIntervention: boolean;
}

export interface NearbyTechnician extends TechnicianWithLocation {
  distanceKm: number;
  estimatedTravelTimeMinutes: number;
  estimatedArrivalTime: Date;
}

export interface TechnicianProfile {
  iban?: string;
  bic?: string;
  bank_account_holder?: string;
  siren?: string;
  vat_number?: string | null;
  company_name?: string;
  legal_status?: string;
}

export interface TechnicianWithoutPosition {
  id: string;
  userId: string;
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export interface TechnicianPosition {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
}

export interface ITechniciansService {
  // ── Géolocalisation ──
  updateTechnicianLocation(userId: string, latitude: number, longitude: number, city: string | null, department: string | null): Promise<void>;
  getActiveTechniciansWithLocation(): Promise<TechnicianWithLocation[]>;
  getActiveTechniciansWithLocationEnriched(): Promise<EnrichedTechnicianLocation[]>;
  getNearestTechnicians(targetLatitude: number, targetLongitude: number, limit?: number): Promise<NearbyTechnician[]>;
  getTechniciansWithoutPosition(): Promise<TechnicianWithoutPosition[]>;
  remindTechniciansLocation(technicianIds: string[]): Promise<{ sent: number; failed: number; skipped: number }>;

  // ── Profil enrichi ──
  getTechnicianPosition(technicianId: string): Promise<TechnicianPosition | null>;
  getTechnicianAvatar(technicianId: string): Promise<string | null>;
  getTechnicianProfile(technicianId: string): Promise<TechnicianProfile | null>;
}

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

export interface NearbyTechnician extends TechnicianWithLocation {
  distanceKm: number;
  estimatedTravelTimeMinutes: number;
  estimatedArrivalTime: Date;
}

export interface EligibleTechnician {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  companyName: string;
  currentCity: string | null;
  latitude: number | null;
  longitude: number | null;
  skills: string[];
  averageRating: number | null;
  distanceKm: number;
  estimatedArrivalMinutes: number;
}

export interface ITechniciansService {
  updateTechnicianLocation(userId: string, latitude: number, longitude: number, city: string | null, department: string | null): Promise<void>;
  getActiveTechniciansWithLocation(): Promise<TechnicianWithLocation[]>;
  getNearestTechnicians(targetLatitude: number, targetLongitude: number, limit?: number): Promise<NearbyTechnician[]>;
}

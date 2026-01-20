import { supabase } from '@/integrations/supabase/client';
import { calculateDistance } from '@/utils/geolocation';

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

class TechniciansService {
  async updateTechnicianLocation(
    userId: string,
    latitude: number,
    longitude: number,
    city: string | null,
    department: string | null
  ): Promise<void> {
    const { error } = await supabase
      .from('partner_applications')
      .update({
        latitude,
        longitude,
        current_city: city,
        department,
      } as Record<string, unknown>)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating technician location:', error);
      throw error;
    }
  }

  async getActiveTechniciansWithLocation(): Promise<TechnicianWithLocation[]> {
    // Get partner applications with geolocation data
    const { data: applications, error: appError } = await supabase
      .from('partner_applications')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .eq('status', 'approved');

    if (appError) throw appError;
    if (!applications || applications.length === 0) return [];

    // Get user info for each application
    const userIds = applications.map(app => app.user_id).filter(Boolean);
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', userIds)
      .eq('is_active', true)
      .eq('role', 'technician');

    if (usersError) throw usersError;

    // Get ratings for technicians
    const { data: ratings, error: ratingsError } = await supabase
      .from('intervention_ratings')
      .select('rating, intervention_id');

    if (ratingsError) throw ratingsError;

    // Get interventions to map ratings to technicians
    const { data: interventions, error: intervError } = await supabase
      .from('interventions')
      .select('id, technician_id')
      .in('technician_id', userIds);

    if (intervError) throw intervError;

    // Calculate average ratings per technician
    const technicianRatings: Record<string, { total: number; count: number }> = {};
    
    ratings?.forEach(rating => {
      const intervention = interventions?.find(i => i.id === rating.intervention_id);
      if (intervention?.technician_id) {
        if (!technicianRatings[intervention.technician_id]) {
          technicianRatings[intervention.technician_id] = { total: 0, count: 0 };
        }
        technicianRatings[intervention.technician_id].total += rating.rating;
        technicianRatings[intervention.technician_id].count += 1;
      }
    });

    // Map applications to technicians with location
    const technicians: TechnicianWithLocation[] = applications
      .filter(app => app.user_id && users?.find(u => u.id === app.user_id))
      .map(app => {
        const user = users!.find(u => u.id === app.user_id)!;
        const ratingData = technicianRatings[app.user_id!];
        
        return {
          id: app.id,
          userId: app.user_id!,
          companyName: app.company_name,
          currentCity: app.current_city,
          department: app.department,
          latitude: app.latitude,
          longitude: app.longitude,
          skills: app.skills || [],
          averageRating: ratingData ? ratingData.total / ratingData.count : null,
          totalRatings: ratingData?.count || 0,
          user: {
            firstName: user.first_name,
            lastName: user.last_name,
          },
        };
      });

    return technicians;
  }

  async getNearestTechnicians(
    targetLatitude: number,
    targetLongitude: number,
    limit: number = 3
  ): Promise<NearbyTechnician[]> {
    const technicians = await this.getActiveTechniciansWithLocation();

    const techniciansWithDistance = technicians
      .filter(t => t.latitude !== null && t.longitude !== null)
      .map(tech => {
        const distanceMeters = calculateDistance(
          targetLatitude,
          targetLongitude,
          tech.latitude!,
          tech.longitude!
        );
        const distanceKm = distanceMeters / 1000;
        
        // Estimate travel time: average speed of 40km/h in urban areas
        const estimatedTravelTimeMinutes = Math.round((distanceKm / 40) * 60);
        
        // Calculate estimated arrival time
        const estimatedArrivalTime = new Date();
        estimatedArrivalTime.setMinutes(
          estimatedArrivalTime.getMinutes() + estimatedTravelTimeMinutes
        );

        return {
          ...tech,
          distanceKm: Math.round(distanceKm * 10) / 10,
          estimatedTravelTimeMinutes,
          estimatedArrivalTime,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    return techniciansWithDistance;
  }
}

export const techniciansService = new TechniciansService();

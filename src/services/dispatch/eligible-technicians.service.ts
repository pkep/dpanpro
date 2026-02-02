import { supabase } from '@/integrations/supabase/client';
import { calculateDistance } from '@/utils/geolocation';

export interface EligibleTechnician {
  id: string;
  firstName: string;
  lastName: string;
  skills: string[];
  avatarUrl: string | null;
  distanceKm: number;
  estimatedArrivalMinutes: number;
  averageRating: number | null;
  totalRatings: number;
  latitude: number;
  longitude: number;
  currentCity: string | null;
}

interface GetEligibleTechniciansParams {
  interventionId: string;
  interventionLatitude: number;
  interventionLongitude: number;
  requiredSkill: string;
  limit?: number;
}

/**
 * Get eligible technicians for an intervention:
 * - Must be active and approved
 * - Must have the required skill
 * - Must not have declined this intervention
 * - Must not have cancelled this intervention
 * - Sorted by distance (nearest first)
 */
export async function getEligibleTechnicians({
  interventionId,
  interventionLatitude,
  interventionLongitude,
  requiredSkill,
  limit = 10,
}: GetEligibleTechniciansParams): Promise<EligibleTechnician[]> {
  // 1. Get declined technician IDs for this intervention
  const { data: declinedData } = await supabase
    .from('declined_interventions')
    .select('technician_id')
    .eq('intervention_id', interventionId);

  const declinedIds = new Set(declinedData?.map((d) => d.technician_id) || []);

  // 2. Get cancelled technician IDs for this intervention
  const { data: cancelledData } = await supabase
    .from('cancelled_assignments')
    .select('technician_id')
    .eq('intervention_id', interventionId);

  const cancelledIds = new Set(cancelledData?.map((c) => c.technician_id) || []);

  // 3. Get all approved partner applications with the required skill and location
  const { data: applications, error: appError } = await supabase
    .from('partner_applications')
    .select('user_id, skills, latitude, longitude, current_city')
    .eq('status', 'approved')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .contains('skills', [requiredSkill]);

  if (appError) {
    console.error('Error fetching partner applications:', appError);
    throw appError;
  }

  if (!applications || applications.length === 0) {
    return [];
  }

  // 4. Filter out declined and cancelled technicians
  const eligibleUserIds = applications
    .filter((app) => app.user_id && !declinedIds.has(app.user_id) && !cancelledIds.has(app.user_id))
    .map((app) => app.user_id!);

  if (eligibleUserIds.length === 0) {
    return [];
  }

  // 5. Get active users from the eligible list
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, first_name, last_name, avatar_url')
    .in('id', eligibleUserIds)
    .eq('is_active', true)
    .eq('role', 'technician');

  if (usersError) {
    console.error('Error fetching users:', usersError);
    throw usersError;
  }

  if (!users || users.length === 0) {
    return [];
  }

  // 6. Get ratings for these technicians
  const { data: interventions } = await supabase
    .from('interventions')
    .select('id, technician_id')
    .in('technician_id', users.map((u) => u.id));

  const { data: ratings } = await supabase
    .from('intervention_ratings')
    .select('rating, intervention_id');

  // Calculate average ratings per technician
  const technicianRatings: Record<string, { total: number; count: number }> = {};
  ratings?.forEach((rating) => {
    const intervention = interventions?.find((i) => i.id === rating.intervention_id);
    if (intervention?.technician_id) {
      if (!technicianRatings[intervention.technician_id]) {
        technicianRatings[intervention.technician_id] = { total: 0, count: 0 };
      }
      technicianRatings[intervention.technician_id].total += rating.rating;
      technicianRatings[intervention.technician_id].count += 1;
    }
  });

  // 7. Build technician objects with distance calculation
  const techniciansWithDistance: EligibleTechnician[] = users
    .map((user) => {
      const app = applications.find((a) => a.user_id === user.id);
      if (!app || app.latitude === null || app.longitude === null) return null;

      const distanceMeters = calculateDistance(
        interventionLatitude,
        interventionLongitude,
        app.latitude,
        app.longitude
      );

      // Apply road detour factor (1.4x for urban areas)
      const ROAD_DETOUR_FACTOR = 1.4;
      const distanceKm = (distanceMeters / 1000) * ROAD_DETOUR_FACTOR;

      // Estimate travel time: 25 km/h average + 5 min departure prep
      const AVG_SPEED_KMH = 25;
      const BASE_DEPARTURE_MINUTES = 5;
      const estimatedArrivalMinutes = BASE_DEPARTURE_MINUTES + Math.round((distanceKm / AVG_SPEED_KMH) * 60);

      const ratingData = technicianRatings[user.id];

      return {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url,
        skills: app.skills || [],
        latitude: app.latitude,
        longitude: app.longitude,
        currentCity: app.current_city,
        distanceKm: Math.round(distanceKm * 10) / 10,
        estimatedArrivalMinutes,
        averageRating: ratingData ? Math.round((ratingData.total / ratingData.count) * 10) / 10 : null,
        totalRatings: ratingData?.count || 0,
      };
    })
    .filter((t): t is EligibleTechnician => t !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);

  return techniciansWithDistance;
}

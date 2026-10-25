import { supabase } from '@/integrations/supabase/client';
import { calculateDistance } from '@/utils/geolocation';
import type { IEligibleTechniciansService, EligibleTechnician, GetEligibleParams } from '@/services/interfaces/eligible-technicians.interface';

class SupabaseEligibleTechniciansService implements IEligibleTechniciansService {
  async getEligibleTechnicians(params: GetEligibleParams): Promise<EligibleTechnician[]> {
  const { interventionId, interventionLatitude, interventionLongitude, requiredSkill, limit = 10 } = params;

  if (!interventionLatitude || !interventionLongitude) return [];

  // 1. Get approved partner applications with matching skill
  const { data: applications, error: appError } = await supabase
    .from('partner_applications')
    .select('*')
    .eq('status', 'approved')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .contains('skills', [requiredSkill]);

  if (appError) throw appError;
  if (!applications || applications.length === 0) return [];

  const userIds = applications.map(a => a.user_id).filter(Boolean) as string[];

  // 2. Get user info + exclude those who declined/cancelled this intervention
  const [usersResult, declinedResult, cancelledResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, avatar_url')
      .in('id', userIds)
      .eq('is_active', true)
      .eq('role', 'technician'),
    supabase
      .from('declined_interventions')
      .select('technician_id')
      .eq('intervention_id', interventionId),
    supabase
      .from('cancelled_assignments')
      .select('technician_id')
      .eq('intervention_id', interventionId),
  ]);

  if (usersResult.error) throw usersResult.error;

   const excludedIds = new Set([
     ...(declinedResult.data || []).map(d => d.technician_id),
     ...(cancelledResult.data || []).map(c => c.technician_id),
   ]);

   // 2.5 Get technicians in active interventions (busy)
   // A suspended intervention keeps its business status → must be excluded.
   const { data: activeInterventions, error: activeError } = await supabase
     .from('interventions')
     .select('technician_id')
     .eq('suspended', false)
     .in('status', ['in_progress', 'assigned', 'on_route', 'arrived'])
     .not('technician_id', 'is', null);

   if (activeError) throw activeError;

   const busyTechnicianIds = new Set(
     (activeInterventions || [])
       .map(i => i.technician_id)
       .filter(Boolean)
   );

   // Add busy technicians to excluded list
   busyTechnicianIds.forEach(id => excludedIds.add(id));

  // 3. Get ratings
  const { data: interventions } = await supabase
    .from('interventions')
    .select('id, technician_id')
    .in('technician_id', userIds);

  const { data: ratings } = await supabase
    .from('intervention_ratings')
    .select('rating, intervention_id');

  const techRatings: Record<string, { total: number; count: number }> = {};
  ratings?.forEach(r => {
    const interv = interventions?.find(i => i.id === r.intervention_id);
    if (interv?.technician_id) {
      if (!techRatings[interv.technician_id]) techRatings[interv.technician_id] = { total: 0, count: 0 };
      techRatings[interv.technician_id].total += r.rating;
      techRatings[interv.technician_id].count += 1;
    }
  });

  // 4. Build eligible list with distance
  const ROAD_DETOUR_FACTOR = 1.4;
  const AVG_SPEED_KMH = 25;
  const BASE_DEPARTURE_MINUTES = 5;

  const eligible: EligibleTechnician[] = applications
    .filter(app => {
      if (!app.user_id || excludedIds.has(app.user_id)) return false;
      return usersResult.data?.some(u => u.id === app.user_id);
    })
    .map(app => {
      const user = usersResult.data!.find(u => u.id === app.user_id)!;
      const distMeters = calculateDistance(
        interventionLatitude, interventionLongitude,
        app.latitude!, app.longitude!
      );
      const distanceKm = Math.round((distMeters / 1000) * ROAD_DETOUR_FACTOR * 10) / 10;
      const estimatedArrivalMinutes = BASE_DEPARTURE_MINUTES + Math.round((distanceKm / AVG_SPEED_KMH) * 60);
      const ratingData = techRatings[app.user_id!];
      const averageRating = ratingData ? Math.round((ratingData.total / ratingData.count) * 10) / 10 : null;
      const proximity = Math.max(0, 100 - distanceKm * 2);
      const ratingScore = averageRating != null ? (averageRating / 5) * 100 : 60;
      const score = Math.round((proximity * 0.4 + 100 * 0.3 + 100 * 0.2 + ratingScore * 0.1) * 100) / 100;

      return {
        id: app.user_id!,
        userId: app.user_id!,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        companyName: app.company_name,
        currentCity: app.current_city,
        latitude: app.latitude,
        longitude: app.longitude,
        skills: app.skills || [],
        averageRating: ratingData ? Math.round((ratingData.total / ratingData.count) * 10) / 10 : null,
        distanceKm,
        estimatedArrivalMinutes,
        score,
        scoreBreakdown: {
          proximity: Math.round(proximity * 100) / 100,
          skills: 100,
          workload: 100,
          rating: Math.round(ratingScore * 100) / 100,
        },
      };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);

  return eligible;
  }
}

export const supabaseEligibleTechniciansService = new SupabaseEligibleTechniciansService();

/**
 * Éligibilité d'un technicien pour une intervention (partagé entre edge functions).
 *
 * Règles canoniques (parité avec le frontend `eligible-technicians.service.ts`
 * et le gateway `EligibleTechniciansService`) :
 *   1. compte technicien actif ;
 *   2. candidature partenaire `approved` ;
 *   3. compétence : `skills` contient la catégorie de l'intervention ;
 *   4. non décliné / non annulé sur cette intervention ;
 *   5. non occupé (aucune intervention active) ;
 *   6. distance route (facteur 1.4) ≤ 50 km ;
 *   7. disponibilité + charge < max_concurrent_interventions.
 */

const MAX_DISTANCE_KM = 50;
const ROAD_DETOUR_FACTOR = 1.4;

const CATEGORY_TO_FR: Record<string, string> = {
  locksmith: 'serrurerie',
  plumbing: 'plomberie',
  electricity: 'electricite',
  glazing: 'vitrerie',
  heating: 'chauffage',
  aircon: 'climatisation',
};

const BUSY_STATUSES = ['assigned', 'on_route', 'arrived', 'in_progress'];

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  distanceKm?: number;
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function checkTechnicianEligibility(
  supabase: any,
  interventionId: string,
  technicianUserId: string,
): Promise<EligibilityResult> {
  const { data: intervention } = await supabase
    .from('interventions')
    .select('id, category, latitude, longitude, technician_id')
    .eq('id', interventionId)
    .maybeSingle();

  if (!intervention) {
    return { eligible: false, reason: 'Intervention introuvable' };
  }

  // 1. Compte technicien actif
  const { data: user } = await supabase
    .from('users')
    .select('id, role, is_active')
    .eq('id', technicianUserId)
    .maybeSingle();

  if (!user || user.role !== 'technician' || user.is_active === false) {
    return { eligible: false, reason: 'Compte technicien inactif' };
  }

  // 2. Candidature partenaire approuvée
  const { data: app } = await supabase
    .from('partner_applications')
    .select('user_id, status, skills, latitude, longitude')
    .eq('user_id', technicianUserId)
    .eq('status', 'approved')
    .maybeSingle();

  if (!app) {
    return { eligible: false, reason: 'Partenaire non approuvé' };
  }

  // 3. Compétence requise
  const skills: string[] = app.skills || [];
  const category: string = intervention.category;
  const categoryFr = CATEGORY_TO_FR[category] || category;
  if (!skills.includes(category) && !skills.includes(categoryFr)) {
    return { eligible: false, reason: 'Compétence requise absente' };
  }

  // 4. Refus / annulation
  const [{ data: declined }, { data: cancelled }] = await Promise.all([
    supabase
      .from('declined_interventions')
      .select('technician_id')
      .eq('intervention_id', interventionId)
      .eq('technician_id', technicianUserId)
      .maybeSingle(),
    supabase
      .from('cancelled_assignments')
      .select('technician_id')
      .eq('intervention_id', interventionId)
      .eq('technician_id', technicianUserId)
      .maybeSingle(),
  ]);

  if (declined || cancelled) {
    return { eligible: false, reason: 'Le technicien a refusé ou annulé cette intervention' };
  }

  // 5. Occupé (hors intervention courante)
  const { data: busy } = await supabase
    .from('interventions')
    .select('id')
    .eq('technician_id', technicianUserId)
    .in('status', BUSY_STATUSES)
    .neq('id', interventionId)
    .limit(1);

  if (busy && busy.length > 0) {
    return { eligible: false, reason: 'Le technicien a déjà une intervention en cours' };
  }

  // 6. Distance
  let distanceKm: number | undefined;
  if (
    intervention.latitude != null &&
    intervention.longitude != null &&
    app.latitude != null &&
    app.longitude != null
  ) {
    const meters = calculateDistanceMeters(
      app.latitude,
      app.longitude,
      intervention.latitude,
      intervention.longitude,
    );
    distanceKm = (meters / 1000) * ROAD_DETOUR_FACTOR;
    if (distanceKm > MAX_DISTANCE_KM) {
      return { eligible: false, reason: 'Partenaire trop loin' };
    }
  }

  // 7. Disponibilité + charge
  const { data: availability } = await supabase
    .from('technician_availability')
    .select('is_available, max_concurrent_interventions')
    .eq('technician_id', technicianUserId)
    .maybeSingle();

  if (availability) {
    if (availability.is_available === false) {
      return { eligible: false, reason: 'Partenaire indisponible' };
    }
    const max = availability.max_concurrent_interventions ?? 3;
    const { count } = await supabase
      .from('interventions')
      .select('id', { count: 'exact', head: true })
      .eq('technician_id', technicianUserId)
      .in('status', BUSY_STATUSES);
    if ((count ?? 0) >= max) {
      return { eligible: false, reason: 'Charge maximale atteinte' };
    }
  }

  return { eligible: true, distanceKm };
}

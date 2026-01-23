import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TechnicianScore {
  technicianId: string;
  userId: string;
  score: number;
  breakdown: {
    proximity: number;
    skills: number;
    workload: number;
    rating: number;
  };
  distanceKm: number;
  estimatedTravelMinutes: number;
}

interface DispatchRequest {
  interventionId: string;
  action?: 'dispatch' | 'accept' | 'reject' | 'check_timeout' | 'decline' | 'cancel' | 'go';
  technicianId?: string;
  reason?: string; // For decline and cancel actions
}

interface Intervention {
  id: string;
  category: string;
  priority: string;
  latitude: number | null;
  longitude: number | null;
  technician_id: string | null;
  status: string;
}

interface TechnicianData {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  skills: string[];
  currentCity: string | null;
}

// Haversine formula to calculate distance in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Score weights as defined in the algorithm
const WEIGHTS = {
  proximity: 0.4,    // 40%
  skills: 0.3,       // 30%
  workload: 0.2,     // 20%
  rating: 0.1,       // 10%
};

// Timeout duration in minutes
const TIMEOUT_MINUTES = 5;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: DispatchRequest = await req.json();
    const { interventionId, action = 'dispatch', technicianId, reason } = body;

    console.log(`[Dispatch] Action: ${action}, Intervention: ${interventionId}, Technician: ${technicianId || 'N/A'}`);

    // Handle different actions
    switch (action) {
      case 'accept':
        return await handleAccept(supabase, interventionId, technicianId!);
      case 'reject':
        return await handleReject(supabase, interventionId, technicianId!);
      case 'decline':
        return await handleDecline(supabase, interventionId, technicianId!, reason || 'Aucun motif fourni');
      case 'cancel':
        return await handleCancel(supabase, interventionId, technicianId!, reason || 'Aucun motif fourni');
      case 'go':
        return await handleGo(supabase, interventionId, technicianId!);
      case 'check_timeout':
        return await handleCheckTimeout(supabase, interventionId);
      case 'dispatch':
      default:
        return await handleDispatch(supabase, interventionId);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Dispatch] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Main dispatch algorithm
async function handleDispatch(supabase: any, interventionId: string) {
  console.log(`[Dispatch] Starting dispatch for intervention: ${interventionId}`);

  // 1. Get intervention details
  const { data: intervention, error: intError } = await supabase
    .from('interventions')
    .select('*')
    .eq('id', interventionId)
    .single();

  if (intError || !intervention) {
    throw new Error(`Intervention not found: ${interventionId}`);
  }

  if (intervention.technician_id) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Intervention already assigned',
        technicianId: intervention.technician_id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!intervention.latitude || !intervention.longitude) {
    throw new Error('Intervention location not set');
  }

  // 2. Cancel any existing pending attempts
  await supabase
    .from('dispatch_attempts')
    .update({ status: 'cancelled' })
    .eq('intervention_id', interventionId)
    .eq('status', 'pending');

  // 2b. Get technicians who have already declined this intervention
  const { data: declinedRecords } = await supabase
    .from('declined_interventions')
    .select('technician_id')
    .eq('intervention_id', interventionId);
  
  const declinedTechnicianIds = new Set((declinedRecords || []).map((d: any) => d.technician_id));

  // 2c. Get technicians who have already cancelled this intervention
  const { data: cancelledRecords } = await supabase
    .from('cancelled_assignments')
    .select('technician_id')
    .eq('intervention_id', interventionId);
  
  const cancelledTechnicianIds = new Set((cancelledRecords || []).map((c: any) => c.technician_id));

  // 3. Get eligible technicians with location
  const { data: applications, error: appError } = await supabase
    .from('partner_applications')
    .select('*')
    .eq('status', 'approved')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (appError) throw appError;
  if (!applications || applications.length === 0) {
    return new Response(
      JSON.stringify({ success: false, message: 'No available technicians' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Filter out technicians who declined or cancelled
  const eligibleApplications = applications.filter((a: any) => 
    !declinedTechnicianIds.has(a.user_id) && !cancelledTechnicianIds.has(a.user_id)
  );

  if (eligibleApplications.length === 0) {
    return new Response(
      JSON.stringify({ success: false, message: 'All eligible technicians have declined or cancelled' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get user IDs from eligible applications
  const userIds = eligibleApplications.map((a: any) => a.user_id).filter(Boolean);

  // 4. Get active technician users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .in('id', userIds)
    .eq('is_active', true)
    .eq('role', 'technician');

  if (usersError) throw usersError;

  // 5. Get availability status
  const { data: availability, error: availError } = await supabase
    .from('technician_availability')
    .select('*')
    .in('technician_id', userIds);

  // 6. Get current workload (active interventions per technician)
  const { data: workloads, error: workloadError } = await supabase
    .from('interventions')
    .select('technician_id')
    .in('technician_id', userIds)
    .in('status', ['assigned', 'on_route', 'in_progress']);

  // Count workload per technician
  const workloadCounts: Record<string, number> = {};
  workloads?.forEach((w: any) => {
    workloadCounts[w.technician_id] = (workloadCounts[w.technician_id] || 0) + 1;
  });

  // 7. Get ratings
  const { data: ratings } = await supabase
    .from('intervention_ratings')
    .select('rating, intervention_id');

  const { data: ratedInterventions } = await supabase
    .from('interventions')
    .select('id, technician_id')
    .in('technician_id', userIds);

  // Calculate average ratings per technician
  const techRatings: Record<string, { total: number; count: number }> = {};
  ratings?.forEach((r: any) => {
    const interv = ratedInterventions?.find((i: any) => i.id === r.intervention_id);
    if (interv?.technician_id) {
      if (!techRatings[interv.technician_id]) {
        techRatings[interv.technician_id] = { total: 0, count: 0 };
      }
      techRatings[interv.technician_id].total += r.rating;
      techRatings[interv.technician_id].count += 1;
    }
  });

  // 8. Calculate scores for each technician
  const scoredTechnicians: TechnicianScore[] = [];
  const requiredSkill = intervention.category;

  for (const app of eligibleApplications) {
    const user = users?.find((u: any) => u.id === app.user_id);
    if (!user) continue;

    // Check availability
    const techAvail = availability?.find((a: any) => a.technician_id === app.user_id);
    const maxConcurrent = techAvail?.max_concurrent_interventions || 3;
    const currentWorkload = workloadCounts[app.user_id] || 0;
    
    if (techAvail?.is_available === false || currentWorkload >= maxConcurrent) {
      console.log(`[Dispatch] Technician ${app.user_id} unavailable (workload: ${currentWorkload}/${maxConcurrent})`);
      continue;
    }

    // Calculate proximity score (40%)
    const distanceMeters = calculateDistance(
      intervention.latitude,
      intervention.longitude,
      app.latitude,
      app.longitude
    );
    const distanceKm = distanceMeters / 1000;
    // Normalize: 0km = 100 points, 50km+ = 0 points
    const proximityScore = Math.max(0, 100 - (distanceKm * 2));

    // Calculate skills score (30%)
    const skills = app.skills || [];
    const hasRequiredSkill = skills.includes(requiredSkill) || 
                             skills.includes(mapCategoryToSkill(requiredSkill));
    const skillsScore = hasRequiredSkill ? 100 : 30; // Penalty for non-matching skill

    // Calculate workload score (20%)
    // 0 interventions = 100 points, 3 interventions = 0 points
    const workloadScore = Math.max(0, 100 - (currentWorkload * 33.33));

    // Calculate rating score (10%)
    const ratingData = techRatings[app.user_id];
    const avgRating = ratingData ? ratingData.total / ratingData.count : 3; // Default to 3/5
    const ratingScore = (avgRating / 5) * 100;

    // Calculate weighted composite score
    const compositeScore = 
      (proximityScore * WEIGHTS.proximity) +
      (skillsScore * WEIGHTS.skills) +
      (workloadScore * WEIGHTS.workload) +
      (ratingScore * WEIGHTS.rating);

    // Estimate travel time (40 km/h average)
    const estimatedTravelMinutes = Math.round((distanceKm / 40) * 60);

    scoredTechnicians.push({
      technicianId: app.id,
      userId: app.user_id,
      score: Math.round(compositeScore * 100) / 100,
      breakdown: {
        proximity: Math.round(proximityScore * 100) / 100,
        skills: skillsScore,
        workload: Math.round(workloadScore * 100) / 100,
        rating: Math.round(ratingScore * 100) / 100,
      },
      distanceKm: Math.round(distanceKm * 10) / 10,
      estimatedTravelMinutes,
    });
  }

  // 9. Sort by score descending
  scoredTechnicians.sort((a, b) => b.score - a.score);

  if (scoredTechnicians.length === 0) {
    return new Response(
      JSON.stringify({ success: false, message: 'No eligible technicians found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[Dispatch] Found ${scoredTechnicians.length} eligible technicians`);
  console.log(`[Dispatch] Top 3:`, scoredTechnicians.slice(0, 3).map(t => ({
    userId: t.userId,
    score: t.score,
    distance: t.distanceKm
  })));

  // 10. Create dispatch attempts for TOP 3 technicians
  const now = new Date();
  const timeoutAt = new Date(now.getTime() + TIMEOUT_MINUTES * 60 * 1000);
  
  // Only take top 3 technicians
  const top3Technicians = scoredTechnicians.slice(0, 3);

  const attempts = top3Technicians.map((tech, index) => ({
    intervention_id: interventionId,
    technician_id: tech.userId,
    score: tech.score,
    score_breakdown: tech.breakdown,
    status: 'pending', // All 3 are pending - first to accept wins
    attempt_order: index + 1,
    notified_at: now.toISOString(), // All 3 are notified immediately
    timeout_at: timeoutAt.toISOString(), // Same timeout for all
  }));

  const { error: insertError } = await supabase
    .from('dispatch_attempts')
    .insert(attempts);

  if (insertError) throw insertError;

  // 11. Do NOT assign yet - wait for technician to accept
  // Just update status to indicate dispatch is pending
  const { error: updateError } = await supabase
    .from('interventions')
    .update({
      status: 'new', // Remains new until a technician accepts
    })
    .eq('id', interventionId);

  if (updateError) throw updateError;

  console.log(`[Dispatch] Notified top 3 technicians:`, top3Technicians.map(t => t.userId));

  // 12. TODO: Send push notifications to all 3 technicians
  // For now, the realtime subscription handles in-app notifications

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Intervention dispatched to top 3 technicians',
      notifiedTechnicians: top3Technicians.map(t => ({
        userId: t.userId,
        score: t.score,
        distanceKm: t.distanceKm,
        estimatedArrivalMinutes: t.estimatedTravelMinutes,
      })),
      timeoutAt: timeoutAt.toISOString(),
      totalCandidates: scoredTechnicians.length,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Handle technician accepting assignment
async function handleAccept(supabase: any, interventionId: string, technicianId: string) {
  console.log(`[Dispatch] Technician ${technicianId} accepting intervention ${interventionId}`);

  const now = new Date();

  // Get intervention to calculate response time
  const { data: intervention, error: getIntError } = await supabase
    .from('interventions')
    .select('created_at')
    .eq('id', interventionId)
    .single();

  if (getIntError) throw getIntError;

  // Calculate response time in seconds
  const createdAt = new Date(intervention.created_at);
  const responseTimeSeconds = Math.round((now.getTime() - createdAt.getTime()) / 1000);

  // Update dispatch attempt
  const { error: attemptError } = await supabase
    .from('dispatch_attempts')
    .update({
      status: 'accepted',
      responded_at: now.toISOString(),
    })
    .eq('intervention_id', interventionId)
    .eq('technician_id', technicianId)
    .eq('status', 'pending');

  if (attemptError) throw attemptError;

  // Cancel other pending attempts
  await supabase
    .from('dispatch_attempts')
    .update({ status: 'cancelled' })
    .eq('intervention_id', interventionId)
    .neq('technician_id', technicianId)
    .eq('status', 'pending');

  // Update intervention status with accepted_at and response_time_seconds
  const { error: intError } = await supabase
    .from('interventions')
    .update({ 
      status: 'on_route',
      accepted_at: now.toISOString(),
      response_time_seconds: responseTimeSeconds,
    })
    .eq('id', interventionId)
    .eq('technician_id', technicianId);

  if (intError) throw intError;

  console.log(`[Dispatch] Intervention ${interventionId} accepted. Response time: ${responseTimeSeconds} seconds`);

  return new Response(
    JSON.stringify({ success: true, message: 'Assignment accepted', responseTimeSeconds }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Handle technician rejecting assignment
async function handleReject(supabase: any, interventionId: string, technicianId: string) {
  console.log(`[Dispatch] Technician ${technicianId} rejecting intervention ${interventionId}`);

  // Update current attempt to rejected
  const { error: attemptError } = await supabase
    .from('dispatch_attempts')
    .update({
      status: 'rejected',
      responded_at: new Date().toISOString(),
    })
    .eq('intervention_id', interventionId)
    .eq('technician_id', technicianId)
    .eq('status', 'pending');

  if (attemptError) throw attemptError;

  // Reassign to next technician
  return await reassignToNext(supabase, interventionId);
}

// Handle timeout check and reassignment
async function handleCheckTimeout(supabase: any, interventionId: string) {
  console.log(`[Dispatch] Checking timeout for intervention ${interventionId}`);

  // Find timed out attempts
  const now = new Date();
  const { data: timedOut, error: timeoutError } = await supabase
    .from('dispatch_attempts')
    .select('*')
    .eq('intervention_id', interventionId)
    .eq('status', 'pending')
    .lt('timeout_at', now.toISOString());

  if (timeoutError) throw timeoutError;

  if (!timedOut || timedOut.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: 'No timeouts to process' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Mark as timed out
  for (const attempt of timedOut) {
    await supabase
      .from('dispatch_attempts')
      .update({ status: 'timeout' })
      .eq('id', attempt.id);
  }

  // Reassign to next
  return await reassignToNext(supabase, interventionId);
}

// Reassign to the next available technician
async function reassignToNext(supabase: any, interventionId: string) {
  // Get next pending attempt in order
  const { data: nextAttempts, error: nextError } = await supabase
    .from('dispatch_attempts')
    .select('*')
    .eq('intervention_id', interventionId)
    .is('notified_at', null)
    .order('attempt_order', { ascending: true })
    .limit(1);

  if (nextError) throw nextError;

  if (!nextAttempts || nextAttempts.length === 0) {
    // No more technicians available
    const { error: unassignError } = await supabase
      .from('interventions')
      .update({
        technician_id: null,
        status: 'new',
      })
      .eq('id', interventionId);

    if (unassignError) throw unassignError;

    console.log(`[Dispatch] No more technicians available for ${interventionId}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'No more technicians available',
        requiresManualAssignment: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const nextTech = nextAttempts[0];
  const now = new Date();
  const timeoutAt = new Date(now.getTime() + TIMEOUT_MINUTES * 60 * 1000);

  // Update attempt with notification time
  await supabase
    .from('dispatch_attempts')
    .update({
      notified_at: now.toISOString(),
      timeout_at: timeoutAt.toISOString(),
      status: 'pending',
    })
    .eq('id', nextTech.id);

  // Assign to next technician
  const { error: updateError } = await supabase
    .from('interventions')
    .update({
      technician_id: nextTech.technician_id,
      status: 'assigned',
    })
    .eq('id', interventionId);

  if (updateError) throw updateError;

  console.log(`[Dispatch] Reassigned to next technician: ${nextTech.technician_id}`);

  // TODO: Send notification to new technician

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Reassigned to next technician',
      newTechnicianId: nextTech.technician_id,
      timeoutAt: timeoutAt.toISOString(),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Map intervention categories to skill names
function mapCategoryToSkill(category: string): string {
  const mapping: Record<string, string> = {
    'plumbing': 'plomberie',
    'electricity': 'electricite',
    'heating': 'chauffage',
    'locksmith': 'serrurerie',
    'glazing': 'vitrerie',
    'aircon': 'climatisation',
  };
  return mapping[category] || category;
}

// Handle technician declining an intervention with reason (persistent - won't be shown again)
async function handleDecline(supabase: any, interventionId: string, technicianId: string, reason: string) {
  console.log(`[Dispatch] Technician ${technicianId} declining intervention ${interventionId} - Reason: ${reason}`);

  // Update dispatch attempt to declined
  const { error: attemptError } = await supabase
    .from('dispatch_attempts')
    .update({
      status: 'rejected',
      responded_at: new Date().toISOString(),
    })
    .eq('intervention_id', interventionId)
    .eq('technician_id', technicianId)
    .eq('status', 'pending');

  if (attemptError) throw attemptError;

  // Persist the decline with reason
  const { error: declineError } = await supabase
    .from('declined_interventions')
    .insert({
      intervention_id: interventionId,
      technician_id: technicianId,
      reason: reason,
    });

  if (declineError) throw declineError;

  return new Response(
    JSON.stringify({ success: true, message: 'Intervention declined' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Handle technician cancelling an accepted assignment with reason (triggers re-dispatch)
async function handleCancel(supabase: any, interventionId: string, technicianId: string, reason: string) {
  console.log(`[Dispatch] Technician ${technicianId} cancelling intervention ${interventionId} - Reason: ${reason}`);

  // Update dispatch attempt to cancelled
  await supabase
    .from('dispatch_attempts')
    .update({
      status: 'cancelled',
      responded_at: new Date().toISOString(),
    })
    .eq('intervention_id', interventionId)
    .eq('technician_id', technicianId);

  // Persist the cancellation with reason
  const { error: cancelError } = await supabase
    .from('cancelled_assignments')
    .insert({
      intervention_id: interventionId,
      technician_id: technicianId,
      reason: reason,
    });

  if (cancelError) throw cancelError;

  // Remove technician from intervention and set status to 'to_reassign'
  const { error: updateError } = await supabase
    .from('interventions')
    .update({
      technician_id: null,
      status: 'to_reassign',
    })
    .eq('id', interventionId);

  if (updateError) throw updateError;

  // Clear all previous dispatch attempts
  await supabase
    .from('dispatch_attempts')
    .update({ status: 'cancelled' })
    .eq('intervention_id', interventionId);

  // Re-dispatch to new top 3 technicians (excluding those who declined or cancelled)
  console.log(`[Dispatch] Re-dispatching intervention ${interventionId}`);
  return await handleDispatch(supabase, interventionId);
}

// Handle "Y aller" - immediately assigns and sets status to on_route
async function handleGo(supabase: any, interventionId: string, technicianId: string) {
  console.log(`[Dispatch] Technician ${technicianId} going directly to intervention ${interventionId}`);

  const now = new Date();

  // Get intervention to calculate response time
  const { data: intervention, error: getIntError } = await supabase
    .from('interventions')
    .select('created_at')
    .eq('id', interventionId)
    .single();

  if (getIntError) throw getIntError;

  // Calculate response time in seconds
  const createdAt = new Date(intervention.created_at);
  const responseTimeSeconds = Math.round((now.getTime() - createdAt.getTime()) / 1000);

  // Update dispatch attempt
  const { error: attemptError } = await supabase
    .from('dispatch_attempts')
    .update({
      status: 'accepted',
      responded_at: now.toISOString(),
    })
    .eq('intervention_id', interventionId)
    .eq('technician_id', technicianId)
    .eq('status', 'pending');

  if (attemptError) throw attemptError;

  // Cancel other pending attempts
  await supabase
    .from('dispatch_attempts')
    .update({ status: 'cancelled' })
    .eq('intervention_id', interventionId)
    .neq('technician_id', technicianId)
    .eq('status', 'pending');

  // Update intervention - assign and set to on_route with timings
  const { error: intError } = await supabase
    .from('interventions')
    .update({ 
      technician_id: technicianId,
      status: 'on_route',
      accepted_at: now.toISOString(),
      response_time_seconds: responseTimeSeconds,
    })
    .eq('id', interventionId);

  if (intError) throw intError;

  console.log(`[Dispatch] Intervention ${interventionId} - Go! Response time: ${responseTimeSeconds} seconds`);

  return new Response(
    JSON.stringify({ success: true, message: 'En route to intervention', responseTimeSeconds }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

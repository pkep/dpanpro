import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PartnerStats {
  partnerId: string;
  averageRating: number | null;
  totalInterventions: number;
  completedInterventions: number;
  averageResponseTimeSeconds: number | null;
  averageArrivalTimeSeconds: number | null;
  averageInterventionTimeSeconds: number | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting partner statistics calculation...');

    // Get all technicians (approved partners)
    const { data: partners, error: partnersError } = await supabase
      .from('partner_applications')
      .select('user_id')
      .eq('status', 'approved')
      .not('user_id', 'is', null);

    if (partnersError) {
      console.error('Error fetching partners:', partnersError);
      throw partnersError;
    }

    if (!partners || partners.length === 0) {
      console.log('No approved partners found');
      return new Response(
        JSON.stringify({ success: true, message: 'No partners to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${partners.length} approved partners to process`);

    const partnerIds = partners.map(p => p.user_id).filter(Boolean);

    // Get all interventions for these technicians
    const { data: interventions, error: intervError } = await supabase
      .from('interventions')
      .select('*')
      .in('technician_id', partnerIds);

    if (intervError) {
      console.error('Error fetching interventions:', intervError);
      throw intervError;
    }

    // Get all ratings
    const { data: ratings, error: ratingsError } = await supabase
      .from('intervention_ratings')
      .select('rating, intervention_id');

    if (ratingsError) {
      console.error('Error fetching ratings:', ratingsError);
      throw ratingsError;
    }

    // Create a map of intervention_id to rating
    const ratingsByIntervention: Record<string, number> = {};
    ratings?.forEach(r => {
      ratingsByIntervention[r.intervention_id] = r.rating;
    });

    // Calculate stats for each partner
    const statsToUpsert: PartnerStats[] = [];

    for (const partnerId of partnerIds) {
      const partnerInterventions = interventions?.filter(i => i.technician_id === partnerId) || [];
      const completedInterventions = partnerInterventions.filter(i => i.status === 'completed');
      
      // Calculate average rating
      const partnerRatings = completedInterventions
        .map(i => ratingsByIntervention[i.id])
        .filter(r => r !== undefined);
      
      const averageRating = partnerRatings.length > 0
        ? partnerRatings.reduce((sum, r) => sum + r, 0) / partnerRatings.length
        : null;

      // Calculate average response time (creation to accepted_at)
      const responseTimes = completedInterventions
        .filter(i => i.response_time_seconds !== null)
        .map(i => i.response_time_seconds);
      
      const averageResponseTimeSeconds = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length)
        : null;

      // Calculate average arrival time (accepted_at to arrived_at)
      const arrivalTimes = completedInterventions
        .filter(i => i.travel_time_seconds !== null)
        .map(i => i.travel_time_seconds);
      
      const averageArrivalTimeSeconds = arrivalTimes.length > 0
        ? Math.round(arrivalTimes.reduce((sum, t) => sum + t, 0) / arrivalTimes.length)
        : null;

      // Calculate average intervention duration (started_at to completed_at)
      const interventionTimes = completedInterventions
        .filter(i => i.intervention_duration_seconds !== null)
        .map(i => i.intervention_duration_seconds);
      
      const averageInterventionTimeSeconds = interventionTimes.length > 0
        ? Math.round(interventionTimes.reduce((sum, t) => sum + t, 0) / interventionTimes.length)
        : null;

      statsToUpsert.push({
        partnerId,
        averageRating: averageRating ? Math.round(averageRating * 100) / 100 : null,
        totalInterventions: partnerInterventions.length,
        completedInterventions: completedInterventions.length,
        averageResponseTimeSeconds,
        averageArrivalTimeSeconds,
        averageInterventionTimeSeconds,
      });
    }

    // Upsert all stats
    let processed = 0;
    for (const stats of statsToUpsert) {
      const { error: upsertError } = await supabase
        .from('partner_statistics')
        .upsert({
          partner_id: stats.partnerId,
          average_rating: stats.averageRating,
          total_interventions: stats.totalInterventions,
          completed_interventions: stats.completedInterventions,
          average_response_time_seconds: stats.averageResponseTimeSeconds,
          average_arrival_time_seconds: stats.averageArrivalTimeSeconds,
          average_intervention_time_seconds: stats.averageInterventionTimeSeconds,
          last_calculated_at: new Date().toISOString(),
        }, {
          onConflict: 'partner_id',
        });

      if (upsertError) {
        console.error(`Error upserting stats for partner ${stats.partnerId}:`, upsertError);
      } else {
        processed++;
        console.log(`Updated stats for partner ${stats.partnerId}: ${stats.completedInterventions} completed interventions`);
      }
    }

    console.log(`Partner statistics calculation completed. Processed ${processed}/${statsToUpsert.length} partners.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Partner statistics calculated successfully',
        processed,
        total: statsToUpsert.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in calculate-partner-statistics:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

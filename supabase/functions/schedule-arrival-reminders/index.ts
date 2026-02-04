import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleRequest {
  interventionId: string;
  technicianId: string;
  acceptedAt: string;
}

// Declare EdgeRuntime for Deno/Supabase Edge Functions
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

// This function is called when a technician accepts an intervention
// It schedules reminder notifications based on the service's target arrival time
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: ScheduleRequest = await req.json();
    const { interventionId, technicianId, acceptedAt } = body;

    console.log(`[Schedule Reminders] Intervention: ${interventionId}, Technician: ${technicianId}, Accepted: ${acceptedAt}`);

    // Get intervention details including category
    const { data: intervention, error: intError } = await supabase
      .from('interventions')
      .select('category, status')
      .eq('id', interventionId)
      .single();

    if (intError || !intervention) {
      console.error('[Schedule Reminders] Intervention not found:', intError);
      return new Response(
        JSON.stringify({ error: 'Intervention not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get service's target arrival time
    const { data: service, error: svcError } = await supabase
      .from('services')
      .select('target_arrival_time_minutes, name')
      .eq('code', intervention.category)
      .single();

    if (svcError || !service) {
      console.log('[Schedule Reminders] Service not found, using default 30 minutes');
    }

    const targetTimeMinutes = service?.target_arrival_time_minutes || 30;
    const acceptedTime = new Date(acceptedAt);

    // Calculate reminder times
    const halfTimeMs = (targetTimeMinutes / 2) * 60 * 1000;
    const fiveMinBeforeMs = (targetTimeMinutes - 5) * 60 * 1000;

    const halfTimeAt = new Date(acceptedTime.getTime() + halfTimeMs);
    const fiveMinAt = new Date(acceptedTime.getTime() + fiveMinBeforeMs);

    const now = new Date();
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    console.log(`[Schedule Reminders] Target time: ${targetTimeMinutes} min, Half time at: ${halfTimeAt.toISOString()}, 5 min reminder at: ${fiveMinAt.toISOString()}`);

    // Schedule half-time reminder (use setTimeout for simplicity in edge function)
    const halfTimeDelay = halfTimeAt.getTime() - now.getTime();
    const fiveMinDelay = fiveMinAt.getTime() - now.getTime();

    const scheduledReminders: string[] = [];

    // Only schedule if the reminder is in the future
    if (halfTimeDelay > 0 && halfTimeDelay < fiveMinDelay) {
      // Use background task to send reminder at half time
      EdgeRuntime.waitUntil((async () => {
        await new Promise(resolve => setTimeout(resolve, halfTimeDelay));
        
        // Check if intervention is still in progress before sending
        const { data: currentIntervention } = await supabase
          .from('interventions')
          .select('status')
          .eq('id', interventionId)
          .single();

        if (currentIntervention && ['assigned', 'on_route'].includes(currentIntervention.status)) {
          const elapsedMinutes = Math.round(targetTimeMinutes / 2);
          await fetch(`${supabaseUrl}/functions/v1/send-technician-arrival-reminder`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              interventionId,
              technicianId,
              reminderType: 'half_time',
              targetTimeMinutes,
              elapsedMinutes,
            }),
          });
          console.log(`[Schedule Reminders] Half-time reminder sent for ${interventionId}`);
        }
      })());
      scheduledReminders.push(`half_time (in ${Math.round(halfTimeDelay / 60000)} min)`);
    }

    // Schedule 5-minute reminder
    if (fiveMinDelay > 0 && targetTimeMinutes > 5) {
      EdgeRuntime.waitUntil((async () => {
        await new Promise(resolve => setTimeout(resolve, fiveMinDelay));
        
        // Check if intervention is still in progress before sending
        const { data: currentIntervention } = await supabase
          .from('interventions')
          .select('status')
          .eq('id', interventionId)
          .single();

        if (currentIntervention && ['assigned', 'on_route'].includes(currentIntervention.status)) {
          const elapsedMinutes = targetTimeMinutes - 5;
          await fetch(`${supabaseUrl}/functions/v1/send-technician-arrival-reminder`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              interventionId,
              technicianId,
              reminderType: 'five_minutes',
              targetTimeMinutes,
              elapsedMinutes,
            }),
          });
          console.log(`[Schedule Reminders] 5-minute reminder sent for ${interventionId}`);
        }
      })());
      scheduledReminders.push(`five_minutes (in ${Math.round(fiveMinDelay / 60000)} min)`);
    }

    console.log(`[Schedule Reminders] Scheduled reminders:`, scheduledReminders);

    return new Response(
      JSON.stringify({
        success: true,
        targetTimeMinutes,
        serviceName: service?.name || intervention.category,
        scheduledReminders,
        halfTimeAt: halfTimeDelay > 0 ? halfTimeAt.toISOString() : null,
        fiveMinAt: fiveMinDelay > 0 ? fiveMinAt.toISOString() : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Schedule Reminders] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function is designed to be called periodically (e.g., every minute via cron)
// to check for timed out dispatch attempts and reassign them

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    console.log(`[Timeout Check] Running at ${now.toISOString()}`);

    // Find all timed out pending attempts
    const { data: timedOutAttempts, error: fetchError } = await supabase
      .from('dispatch_attempts')
      .select('*, interventions!inner(id, status, technician_id)')
      .eq('status', 'pending')
      .lt('timeout_at', now.toISOString());

    if (fetchError) throw fetchError;

    if (!timedOutAttempts || timedOutAttempts.length === 0) {
      console.log('[Timeout Check] No timed out attempts found');
      return new Response(
        JSON.stringify({ processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Timeout Check] Found ${timedOutAttempts.length} timed out attempts`);

    // Group by intervention
    const interventionIds = [...new Set(timedOutAttempts.map(a => a.intervention_id))];
    const results = [];

    for (const interventionId of interventionIds) {
      // Call the dispatch function to handle timeout
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/dispatch-intervention`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          interventionId,
          action: 'check_timeout',
        }),
      });

      const result = await response.json();
      results.push({ interventionId, result });
      
      console.log(`[Timeout Check] Processed intervention ${interventionId}:`, result);
    }

    return new Response(
      JSON.stringify({ 
        processed: interventionIds.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Timeout Check] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

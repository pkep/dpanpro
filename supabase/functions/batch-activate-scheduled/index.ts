import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduledIntervention {
  id: string;
  title: string;
  address: string;
  city: string;
  postal_code: string;
  technician_id: string;
  client_id: string | null;
  scheduled_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const frontendUrl = Deno.env.get("FRONTEND_URL") ?? "https://dpanpro.lovable.app";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("[BatchActivate] Starting scheduled interventions activation");

    // Atomic CTE lock
    const { data: toActivate, error } = await supabase
      .rpc("lock_and_get_scheduled_interventions");

    if (error) throw error;

    const list = (toActivate || []) as ScheduledIntervention[];

    if (list.length === 0) {
      console.log("[BatchActivate] No interventions to activate");
      return new Response(
        JSON.stringify({ activated: 0, message: "No interventions to activate" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[BatchActivate] Locked ${list.length} interventions`);

    let activated = 0;

    for (const intervention of list) {
      try {
        // Update status to 'assigned' and release lock
        const { error: updateError } = await supabase
          .from("interventions")
          .update({ status: "assigned", is_processing: false })
          .eq("id", intervention.id);

        if (updateError) {
          console.error(`[BatchActivate] Failed to update ${intervention.id}:`, updateError);
          await supabase
            .from("interventions")
            .update({ is_processing: false })
            .eq("id", intervention.id);
          continue;
        }

        // Load technician + client
        const { data: technician } = await supabase
          .from("users")
          .select("first_name, email, phone")
          .eq("id", intervention.technician_id)
          .single();

        let clientPhone: string | null = null;
        let clientName = "Client";
        if (intervention.client_id) {
          const { data: client } = await supabase
            .from("users")
            .select("first_name, phone")
            .eq("id", intervention.client_id)
            .single();
          if (client) {
            clientPhone = client.phone;
            clientName = client.first_name || "Client";
          }
        }

        if (!technician) {
          console.error(`[BatchActivate] Missing technician for intervention ${intervention.id}`);
          continue;
        }

        // Notify technician via dedicated edge function
        const trackingCode = intervention.id.substring(0, 8).toUpperCase();
        await fetch(`${supabaseUrl}/functions/v1/notify-scheduled-reminder`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            interventionId: intervention.id,
            technicianId: intervention.technician_id,
            technicianFirstName: technician.first_name,
            technicianEmail: technician.email,
            technicianPhone: technician.phone,
            interventionTitle: intervention.title,
            interventionAddress: intervention.address,
            interventionCity: intervention.city,
            interventionPostalCode: intervention.postal_code,
            scheduled_at: intervention.scheduled_at,
            clientPhone,
            clientName,
            trackingCode,
            trackingUrl: `${frontendUrl}/intervention/${intervention.id}`,
          }),
        }).catch((err) =>
          console.error(`[BatchActivate] Failed to notify technician ${intervention.technician_id}:`, err),
        );

        activated++;
      } catch (itemError) {
        console.error(`[BatchActivate] Error processing ${intervention.id}:`, itemError);
        await supabase
          .from("interventions")
          .update({ is_processing: false })
          .eq("id", intervention.id);
      }
    }

    console.log(`[BatchActivate] Completed: ${activated}/${list.length} activated`);

    return new Response(
      JSON.stringify({
        activated,
        total: list.length,
        interventionIds: list.map((i) => i.id),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[BatchActivate] Error:", error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CLIMB-INTERVENTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

interface RequestBody {
  interventionId: string;
  mode: "internal" | "external";
  category?: string;
  prestationName?: string;
  technicianInformation?: string;
  targetTechnicianId?: string | null;
  signatureData?: string;
  createdBy?: string | null;
}

const generateTrackingCode = (): string =>
  `DP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function invokeFunction(name: string, body: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    logStep(`invoke ${name} failed`, { error: e instanceof Error ? e.message : String(e) });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    if (!body?.interventionId || !body?.mode) {
      return new Response(JSON.stringify({ error: "interventionId and mode are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: parent, error } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", body.interventionId)
      .maybeSingle();

    if (error || !parent) {
      return new Response(JSON.stringify({ error: "Intervention not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const category = body.category ?? parent.category;

    // Consentement éventuellement transmis à cette étape
    const consentPatch: Record<string, unknown> = {};
    if (body.signatureData) {
      consentPatch.escalation_consent_signature_data = body.signatureData;
      consentPatch.escalation_consent_signed_at = now;
      consentPatch.customer_consent = true;
    }

    if (body.mode === "external") {
      const { data: external, error: extError } = await supabase
        .from("external_escalations")
        .insert({
          intervention_id: parent.id,
          category,
          technician_information: body.technicianInformation ?? null,
          status: "to_contact",
          created_by: body.createdBy ?? null,
        } as never)
        .select("id")
        .single();
      if (extError) throw extError;

      const { error: upError } = await supabase
        .from("interventions")
        .update({
          ...consentPatch,
          status: "complete_climbed_external",
          escalation_type: "external",
          escalation_completed_at: now,
        } as never)
        .eq("id", parent.id);
      if (upError) throw upError;

      await invokeFunction("notify-escalation-climbed-external", {
        interventionId: parent.id,
        companyName: null,
      });

      logStep("External escalation created", { interventionId: parent.id, externalId: external?.id });

      return new Response(
        JSON.stringify({ success: true, escalationType: "external", externalEscalationId: external?.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Interne : création de l'intervention enfant
    const { data: child, error: childError } = await supabase
      .from("interventions")
      .insert({
        client_id: parent.client_id,
        category,
        title: parent.title,
        description: parent.description,
        address: parent.address,
        city: parent.city,
        postal_code: parent.postal_code,
        latitude: parent.latitude,
        longitude: parent.longitude,
        priority: parent.priority,
        status: "new",
        is_active: true,
        client_email: parent.client_email,
        client_phone: parent.client_phone,
        client_first_name: parent.client_first_name ?? null,
        client_last_name: parent.client_last_name ?? null,
        tracking_code: generateTrackingCode(),
        parent_id_intervention: parent.id,
      } as never)
      .select("id")
      .single();
    if (childError) throw childError;

    const { error: upError } = await supabase
      .from("interventions")
      .update({
        ...consentPatch,
        status: "complete_climbed",
        escalation_type: "internal",
        escalation_completed_at: now,
      } as never)
      .eq("id", parent.id);
    if (upError) throw upError;

    // Bandeau/notification : un nouveau technicien Dépann.Pro prend le relais
    await invokeFunction("notify-escalation-climbed-internal", {
      interventionId: parent.id,
      technicianName: null,
    });

    logStep("Internal escalation created", { parentId: parent.id, childId: child?.id });

    return new Response(
      JSON.stringify({ success: true, escalationType: "internal", childInterventionId: child?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ELIGIBLE_STATUSES = ["assigned", "on_route", "arrived", "in_progress", "completed"];
const ACTIVE_STATUSES = ["assigned", "on_route", "arrived", "in_progress"];

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
  } catch (error) {
    console.error(`[MANUAL-ESCALATION] invoke ${name} failed`, error);
  }
}

interface RequestBody {
  interventionId?: string;
  mode?: string;
  category?: string;
  createdBy?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: RequestBody = await req.json();
    if (!body.interventionId || !body.mode || !body.category) {
      return json({ error: "interventionId, mode and category are required" }, 400);
    }

    const mode = body.mode.toLowerCase();
    if (mode !== "internal" && mode !== "external") {
      return json({ error: "mode must be internal or external" }, 400);
    }

    if (!body.createdBy) return json({ error: "createdBy is required" }, 403);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: actor } = await supabase
      .from("users")
      .select("role")
      .eq("id", body.createdBy)
      .maybeSingle();
    if (!actor || !["admin", "manager"].includes(actor.role)) {
      return json({ error: "Accès réservé aux administrateurs et managers" }, 403);
    }

    const { data: parent, error: parentError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", body.interventionId)
      .maybeSingle();

    if (parentError || !parent) return json({ error: "Intervention not found" }, 404);
    if (!ELIGIBLE_STATUSES.includes(parent.status)) {
      return json({ error: "Cette intervention n'est pas éligible à une escalade à froid" }, 400);
    }

    const createdAt = new Date(parent.created_at).getTime();
    if (!Number.isFinite(createdAt) || createdAt < Date.now() - 7 * 24 * 60 * 60 * 1000) {
      return json({ error: "Cette intervention a été créée il y a plus de 7 jours" }, 400);
    }

    if (body.category === parent.category) {
      return json({ error: "Le type d'intervention doit être différent du type actuel" }, 400);
    }

    const [{ data: existingChild }, { data: existingExternal }] = await Promise.all([
      supabase
        .from("interventions")
        .select("id")
        .eq("parent_id_intervention", parent.id)
        .eq("category", body.category)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("external_escalations")
        .select("id")
        .eq("intervention_id", parent.id)
        .eq("category", body.category)
        .limit(1)
        .maybeSingle(),
    ]);
    if (existingChild || existingExternal) {
      return json({ error: "Une escalade existe déjà pour ce type d'intervention" }, 409);
    }

    const now = new Date().toISOString();
    const active = ACTIVE_STATUSES.includes(parent.status);
    let childInterventionId: string | null = null;

    if (mode === "external") {
      const { error: externalError } = await supabase
        .from("external_escalations")
        .insert({
          intervention_id: parent.id,
          category: body.category,
          status: "to_contact",
          created_by: body.createdBy ?? null,
        } as never);
      if (externalError) throw externalError;
    } else {
      const { data: child, error: childError } = await supabase
        .from("interventions")
        .insert({
          client_id: parent.client_id,
          category: body.category,
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
          photos: parent.photos ?? null,
          b2b_partner_id: parent.b2b_partner_id ?? null,
          billing_type: parent.billing_type ?? "client",
          b2b_order_reference: parent.b2b_order_reference ?? null,
          b2b_price_cap: parent.b2b_price_cap ?? null,
          tracking_code: generateTrackingCode(),
          parent_id_intervention: parent.id,
        } as never)
        .select("id")
        .single();
      if (childError) throw childError;
      childInterventionId = child?.id ?? null;
    }

    const nextStatus = active
      ? (mode === "external" ? "complete_climbed_external" : "complete_climbed")
      : parent.status;

    const { error: updateError } = await supabase
      .from("interventions")
      .update({
        status: nextStatus,
        escalation_type: mode,
        escalation_requested_at: parent.escalation_requested_at ?? now,
        escalation_completed_at: now,
      } as never)
      .eq("id", parent.id);
    if (updateError) throw updateError;

    if (active) {
      if (mode === "external") {
        await invokeFunction("notify-escalation-climbed-external", {
          interventionId: parent.id,
          companyName: null,
        });
      } else {
        await invokeFunction("notify-escalation-climbed-internal", {
          interventionId: parent.id,
          technicianName: null,
        });
      }
    }

    return json({
      success: true,
      parentInterventionId: parent.id,
      childInterventionId,
      mode,
      category: body.category,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[MANUAL-ESCALATION] error", error);
    return json({ error: message }, 500);
  }
});

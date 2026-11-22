import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_LABELS: Record<string, string> = {
  locksmith: "Serrurerie",
  plumbing: "Plomberie",
  electricity: "Électricité",
  glazing: "Vitrerie",
  heating: "Chauffage",
  aircon: "Climatisation",
  other: "Autre",
};

const PRIORITIES = ["urgent", "high", "normal", "low"];

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const generateTrackingCode = (): string =>
  `DP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

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
    console.error(`[CREATE-FROM] invoke ${name} failed`, error);
  }
}

interface RequestBody {
  interventionId?: string;
  category?: string;
  description?: string | null;
  priority?: string | null;
  createdBy?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: RequestBody = await req.json();
    if (!body.interventionId || !body.category) {
      return json({ error: "interventionId and category are required" }, 400);
    }
    if (!body.createdBy) return json({ error: "createdBy is required" }, 403);

    const priority = body.priority ?? "normal";
    if (!PRIORITIES.includes(priority)) {
      return json({ error: "Invalid priority" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: actor } = await supabase
      .from("users")
      .select("role")
      .eq("id", body.createdBy)
      .maybeSingle();
    if (!actor || !["admin", "manager"].includes(actor.role)) {
      return json({ error: "Accès réservé aux administrateurs et managers" }, 403);
    }

    const { data: source, error: sourceError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", body.interventionId)
      .maybeSingle();
    if (sourceError || !source) return json({ error: "Intervention source introuvable" }, 404);

    const categoryLabel = CATEGORY_LABELS[body.category] ?? body.category;
    const title = `${categoryLabel} - ${source.address} - ${source.postal_code}`;

    const { data: created, error: createError } = await supabase
      .from("interventions")
      .insert({
        client_id: source.client_id,
        category: body.category,
        title,
        description: body.description ?? null,
        address: source.address,
        city: source.city,
        postal_code: source.postal_code,
        latitude: source.latitude,
        longitude: source.longitude,
        priority,
        status: "new",
        is_active: true,
        client_email: source.client_email,
        client_phone: source.client_phone,
        client_first_name: source.client_first_name ?? null,
        client_last_name: source.client_last_name ?? null,
        b2b_partner_id: source.b2b_partner_id ?? null,
        billing_type: source.billing_type ?? "client",
        b2b_order_reference: source.b2b_order_reference ?? null,
        b2b_price_cap: source.b2b_price_cap ?? null,
        tracking_code: generateTrackingCode(),
      } as never)
      .select("id, billing_type")
      .single();
    if (createError) throw createError;

    await supabase.from("intervention_history_status").insert({
      intervention_id: created.id,
      status: "new",
    } as never);

    await invokeFunction("dispatch-intervention", { interventionId: created.id });

    if (created.billing_type !== "b2b") {
      await invokeFunction("notify-new-intervention", { interventionId: created.id });
    }

    return json({
      success: true,
      sourceInterventionId: source.id,
      newInterventionId: created.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-FROM] error", error);
    return json({ error: message }, 500);
  }
});

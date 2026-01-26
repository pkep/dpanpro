import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  trackingCode: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const { trackingCode }: RequestBody = await req.json();
    if (!trackingCode) throw new Error("Missing trackingCode");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Resolve intervention from tracking code (client-facing secret)
    const { data: intervention, error: interventionError } = await supabase
      .from("interventions")
      .select("id, tracking_code")
      .eq("tracking_code", trackingCode.toUpperCase())
      .maybeSingle();

    if (interventionError) throw interventionError;
    if (!intervention) {
      return new Response(
        JSON.stringify({ found: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get latest authorization
    const { data: auth, error: authError } = await supabase
      .from("payment_authorizations")
      .select("*")
      .eq("intervention_id", intervention.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (authError) throw authError;
    if (!auth) {
      return new Response(
        JSON.stringify({
          found: true,
          interventionId: intervention.id,
          authorization: null,
          stripe: null,
          authorized: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let stripeStatus: string | null = null;
    if (auth.provider_payment_id) {
      const pi = await stripe.paymentIntents.retrieve(auth.provider_payment_id);
      stripeStatus = pi.status;
      console.log(
        "[PAYMENT-AUTH-STATUS]",
        "trackingCode=", trackingCode,
        "authStatus=", auth.status,
        "piStatus=", stripeStatus
      );
    }

    const stripeAuthorized = stripeStatus === "requires_capture" || stripeStatus === "succeeded";

    // Keep DB status aligned with Stripe reality (avoid false 'authorized')
    if (auth.status === "authorized" && !stripeAuthorized) {
      await supabase
        .from("payment_authorizations")
        .update({
          status: "failed",
          metadata: {
            ...(auth.metadata ?? {}),
            sync_note: "Status corrected: DB was authorized but Stripe was not capturable",
            stripe_status: stripeStatus,
            synced_at: new Date().toISOString(),
          },
        } as Record<string, unknown>)
        .eq("id", auth.id);

      auth.status = "failed";
    }

    if ((auth.status === "pending" || auth.status === "failed") && stripeAuthorized) {
      await supabase
        .from("payment_authorizations")
        .update({
          status: "authorized",
          authorization_confirmed_at: new Date().toISOString(),
          metadata: {
            ...(auth.metadata ?? {}),
            stripe_status: stripeStatus,
            synced_at: new Date().toISOString(),
          },
        } as Record<string, unknown>)
        .eq("id", auth.id);

      auth.status = "authorized";
    }

    return new Response(
      JSON.stringify({
        found: true,
        interventionId: intervention.id,
        authorization: {
          id: auth.id,
          status: auth.status,
          amountAuthorized: auth.amount_authorized,
          currency: auth.currency,
          createdAt: auth.created_at,
        },
        stripe: {
          status: stripeStatus,
        },
        authorized: auth.status === "authorized" && stripeAuthorized,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[PAYMENT-AUTH-STATUS] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

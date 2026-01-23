import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[INCREMENT-AUTHORIZATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const { interventionId, additionalAmount } = await req.json();
    logStep("Request body parsed", { interventionId, additionalAmount });

    if (!interventionId || additionalAmount === undefined) {
      throw new Error("Missing required parameters: interventionId and additionalAmount");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the payment authorization for this intervention
    const { data: authorization, error: authError } = await supabaseClient
      .from("payment_authorizations")
      .select("*")
      .eq("intervention_id", interventionId)
      .eq("status", "authorized")
      .single();

    if (authError || !authorization) {
      logStep("No authorized payment found", { error: authError?.message });
      throw new Error("No authorized payment found for this intervention");
    }

    logStep("Found authorization", { 
      id: authorization.id, 
      paymentIntentId: authorization.provider_payment_id,
      currentAmount: authorization.amount_authorized 
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const paymentIntentId = authorization.provider_payment_id;
    if (!paymentIntentId) {
      throw new Error("No payment intent ID found in authorization");
    }

    // Get current payment intent to check status
    const currentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    logStep("Current payment intent status", { 
      status: currentIntent.status, 
      amount: currentIntent.amount 
    });

    if (currentIntent.status !== "requires_capture") {
      throw new Error(`Payment intent is not in capturable state: ${currentIntent.status}`);
    }

    const additionalAmountCents = Math.round(additionalAmount * 100);
    const newTotalCents = currentIntent.amount + additionalAmountCents;
    const newTotalEuros = newTotalCents / 100;

    logStep("Attempting to increment authorization", {
      currentAmountCents: currentIntent.amount,
      additionalAmountCents,
      newTotalCents,
    });

    // Try to increment the authorization
    // Note: increment_authorization is only available for certain card types/regions
    try {
      const updatedIntent = await stripe.paymentIntents.incrementAuthorization(
        paymentIntentId,
        { amount: newTotalCents }
      );

      logStep("Authorization incremented successfully", { 
        newAmount: updatedIntent.amount 
      });

      // Update the authorization record in database
      await supabaseClient
        .from("payment_authorizations")
        .update({
          amount_authorized: newTotalEuros,
          updated_at: new Date().toISOString(),
          metadata: {
            ...authorization.metadata,
            increment_history: [
              ...(authorization.metadata?.increment_history || []),
              {
                timestamp: new Date().toISOString(),
                previous_amount: authorization.amount_authorized,
                additional_amount: additionalAmount,
                new_amount: newTotalEuros,
              }
            ]
          }
        })
        .eq("id", authorization.id);

      logStep("Database updated with new authorization amount");

      return new Response(
        JSON.stringify({
          success: true,
          method: "increment",
          previousAmount: authorization.amount_authorized,
          additionalAmount: additionalAmount,
          newAmount: newTotalEuros,
          paymentIntentId: paymentIntentId,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (stripeError) {
      // If increment authorization fails (not supported by card), log and continue
      // The additional amount will be handled at capture time
      logStep("Increment authorization not supported, will handle at capture", { 
        error: stripeError instanceof Error ? stripeError.message : String(stripeError) 
      });

      // Update the authorization record to track the additional amount needed
      await supabaseClient
        .from("payment_authorizations")
        .update({
          updated_at: new Date().toISOString(),
          metadata: {
            ...authorization.metadata,
            pending_additional_amount: additionalAmount,
            increment_attempted_at: new Date().toISOString(),
            increment_error: stripeError instanceof Error ? stripeError.message : String(stripeError),
          }
        })
        .eq("id", authorization.id);

      return new Response(
        JSON.stringify({
          success: true,
          method: "deferred",
          message: "Increment not supported by card. Additional amount will be charged at capture.",
          previousAmount: authorization.amount_authorized,
          additionalAmount: additionalAmount,
          pendingAdditionalAmount: additionalAmount,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

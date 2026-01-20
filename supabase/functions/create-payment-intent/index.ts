import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-INTENT] ${step}${detailsStr}`);
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

    const { authorizationId, amount, currency, customerEmail, interventionId } = await req.json();
    logStep("Request body parsed", { authorizationId, amount, currency, customerEmail, interventionId });

    if (!authorizationId || !amount || !customerEmail || !interventionId) {
      throw new Error("Missing required parameters");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists or create one
    let customerId: string;
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      const newCustomer = await stripe.customers.create({ email: customerEmail });
      customerId = newCustomer.id;
      logStep("Created new customer", { customerId });
    }

    // Create a PaymentIntent with manual capture (authorization only)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency: currency || "eur",
      customer: customerId,
      capture_method: "manual", // Authorization hold - won't capture until we call capture
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        intervention_id: interventionId,
        authorization_id: authorizationId,
      },
      description: "Autorisation de paiement - Intervention",
    });

    logStep("PaymentIntent created", { paymentIntentId: paymentIntent.id, clientSecret: paymentIntent.client_secret?.slice(0, 20) + "..." });

    // Update the authorization record with payment intent ID
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabaseClient
      .from("payment_authorizations")
      .update({
        provider_payment_id: paymentIntent.id,
        provider_customer_id: customerId,
      })
      .eq("id", authorizationId);

    logStep("Authorization record updated");

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        customerId: customerId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
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

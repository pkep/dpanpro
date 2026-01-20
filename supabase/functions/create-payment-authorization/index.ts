import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-AUTHORIZATION] ${step}${detailsStr}`);
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
    let customerId: string | undefined;
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      const newCustomer = await stripe.customers.create({ email: customerEmail });
      customerId = newCustomer.id;
      logStep("Created new customer", { customerId });
    }

    // Create a checkout session with payment intent for authorization (manual capture)
    const origin = req.headers.get("origin") || "https://id-preview--26413c4a-0f7f-4646-98a6-b3f5e8e66a14.lovable.app";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_intent_data: {
        capture_method: "manual", // This creates an authorization hold instead of immediate capture
        metadata: {
          intervention_id: interventionId,
          authorization_id: authorizationId,
        },
      },
      line_items: [
        {
          price_data: {
            currency: currency || "eur",
            product_data: {
              name: "Autorisation de paiement - Intervention",
              description: "Montant bloqué en attendant la fin de l'intervention. Le paiement réel sera effectué après l'intervention.",
            },
            unit_amount: Math.round(amount * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/new-intervention?payment=success&authorization_id=${authorizationId}`,
      cancel_url: `${origin}/new-intervention?payment=cancelled&authorization_id=${authorizationId}`,
      metadata: {
        intervention_id: interventionId,
        authorization_id: authorizationId,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Update the authorization record with payment intent ID
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get payment intent ID from session
    const paymentIntentId = session.payment_intent as string;

    await supabaseClient
      .from("payment_authorizations")
      .update({
        provider_payment_id: paymentIntentId || session.id,
        provider_customer_id: customerId,
      })
      .eq("id", authorizationId);

    logStep("Authorization record updated");

    return new Response(
      JSON.stringify({
        checkoutUrl: session.url,
        sessionId: session.id,
        paymentIntentId: paymentIntentId,
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

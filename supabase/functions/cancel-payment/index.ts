import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface CancelRequest {
  interventionId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interventionId }: CancelRequest = await req.json();

    console.log("Cancelling payment for intervention:", interventionId);

    // Get payment authorization
    const { data: auth, error: authError } = await supabase
      .from("payment_authorizations")
      .select("*")
      .eq("intervention_id", interventionId)
      .in("status", ["pending", "authorized"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (authError) {
      throw new Error("Error fetching payment authorization");
    }

    if (!auth) {
      // No payment to cancel
      console.log("No payment authorization found to cancel");
      return new Response(
        JSON.stringify({ success: true, message: "No payment to cancel" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (auth.provider_payment_id) {
      try {
        // Cancel the payment intent in Stripe
        await stripe.paymentIntents.cancel(auth.provider_payment_id);
        console.log("Payment intent cancelled in Stripe");
      } catch (stripeErr) {
        console.error("Error cancelling in Stripe:", stripeErr);
        // Continue anyway to update our records
      }
    }

    // Update payment authorization
    await supabase
      .from("payment_authorizations")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("id", auth.id);

    console.log("Payment authorization cancelled");

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error cancelling payment:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

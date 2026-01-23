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

interface CaptureRequest {
  interventionId: string;
  amount: number; // Amount in cents
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interventionId, amount }: CaptureRequest = await req.json();

    console.log("Capturing payment for intervention:", interventionId, "Amount:", amount);

    // Get payment authorization
    const { data: auth, error: authError } = await supabase
      .from("payment_authorizations")
      .select("*")
      .eq("intervention_id", interventionId)
      .eq("status", "authorized")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (authError || !auth) {
      throw new Error("No authorized payment found for this intervention");
    }

    if (!auth.provider_payment_id) {
      throw new Error("No payment intent ID found");
    }

    // Check if we need to capture more than authorized
    const authorizedCents = Math.round(auth.amount_authorized * 100);
    
    if (amount > authorizedCents) {
      // We need to capture the original and potentially request additional payment
      // For now, we'll just capture what was authorized and note the difference
      console.log(`Amount ${amount} exceeds authorized ${authorizedCents}. Capturing authorized amount.`);
      
      // Capture the original amount
      await stripe.paymentIntents.capture(auth.provider_payment_id, {
        amount_to_capture: authorizedCents,
      });

      // TODO: Handle the additional amount - create a new payment intent for the difference
      const additionalAmount = amount - authorizedCents;
      console.log(`Additional amount to collect: ${additionalAmount} cents`);
      
      // For now, update the auth record
      await supabase
        .from("payment_authorizations")
        .update({
          status: "captured",
          captured_at: new Date().toISOString(),
          metadata: {
            ...auth.metadata,
            captured_amount: authorizedCents,
            additional_amount_pending: additionalAmount,
          },
        } as Record<string, unknown>)
        .eq("id", auth.id);
    } else {
      // Capture the requested amount (equal or less than authorized)
      await stripe.paymentIntents.capture(auth.provider_payment_id, {
        amount_to_capture: amount,
      });

      // Update payment authorization
      await supabase
        .from("payment_authorizations")
        .update({
          status: "captured",
          captured_at: new Date().toISOString(),
          metadata: {
            ...auth.metadata,
            captured_amount: amount,
          },
        } as Record<string, unknown>)
        .eq("id", auth.id);
    }

    console.log("Payment captured successfully");

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error capturing payment:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

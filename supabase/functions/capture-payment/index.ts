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

    // Get payment authorization (most recent one)
    const { data: auth, error: authError } = await supabase
      .from("payment_authorizations")
      .select("*")
      .eq("intervention_id", interventionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (authError || !auth) {
      throw new Error("No payment authorization found for this intervention");
    }

    // If already captured, return success
    if (auth.status === "captured") {
      console.log("Payment already captured for this intervention");
      return new Response(
        JSON.stringify({ success: true, alreadyCaptured: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If cancelled, throw error
    if (auth.status === "cancelled") {
      throw new Error("Payment authorization was cancelled");
    }

    if (!auth.provider_payment_id) {
      throw new Error("No payment intent ID found");
    }

    // Fetch PaymentIntent and ensure it's capturable.
    // In some cases (client never completed authorization), the intent may still be in
    // `requires_payment_method` / `requires_confirmation`.
    let paymentIntent = await stripe.paymentIntents.retrieve(auth.provider_payment_id);
    console.log("PaymentIntent status:", paymentIntent.status);

    if (paymentIntent.status === "requires_payment_method" || paymentIntent.status === "requires_confirmation") {
      // Try to recover by confirming off-session with an already saved card on the customer.
      // This allows technicians to finalize when the customer has a saved payment method
      // from previous successful authorizations.
      const customerId =
        (auth as Record<string, unknown>).provider_customer_id as string | null;
      const resolvedCustomerId =
        customerId || (typeof paymentIntent.customer === "string" ? paymentIntent.customer : paymentIntent.customer?.id) || null;

      if (resolvedCustomerId) {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: resolvedCustomerId,
          type: "card",
          limit: 1,
        });

        if (paymentMethods.data.length > 0) {
          const pm = paymentMethods.data[0];
          console.log("Attempting off-session confirmation with saved payment method", pm.id);

          paymentIntent = await stripe.paymentIntents.confirm(auth.provider_payment_id, {
            payment_method: pm.id,
            off_session: true,
          });
          console.log("PaymentIntent status after confirm:", paymentIntent.status);
        } else {
          console.log("No saved card payment method found on customer", resolvedCustomerId);
        }
      } else {
        console.log("No customerId available to recover PaymentIntent confirmation");
      }
    }

    if (paymentIntent.status !== "requires_capture") {
      // Do not attempt capture if Stripe doesn't allow it.
      // Notify client to authorize their card
      console.log("Payment not authorized - notifying client to authorize card");
      
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        
        await fetch(`${supabaseUrl}/functions/v1/notify-payment-required`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            interventionId,
            reason: `PaymentIntent status: ${paymentIntent.status}`,
          }),
        });
        console.log("Client notification sent for payment authorization");
      } catch (notifyErr) {
        console.error("Failed to send payment notification:", notifyErr);
      }
      
      throw new Error(
        `Payment not authorized (PaymentIntent status: ${paymentIntent.status}). The customer must authorize the card before capture. A notification has been sent to the client.`
      );
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

    // Notify technician about successful payment
    try {
      const { data: interventionData } = await supabase
        .from("interventions")
        .select("technician_id, title, category, client_email, client_phone")
        .eq("id", interventionId)
        .single();

      if (interventionData?.technician_id) {
        const { data: techData } = await supabase
          .from("users")
          .select("email, phone, first_name")
          .eq("id", interventionData.technician_id)
          .single();

        const capturedAmountEuros = (amount / 100).toFixed(2);

        // Send email notification to technician
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
        if (resendApiKey && resendFromEmail && techData?.email) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: resendFromEmail,
                to: [techData.email],
                subject: `✅ Paiement confirmé - ${capturedAmountEuros} €`,
                html: `<p>Bonjour ${techData.first_name || ""},</p>
                  <p>Le paiement de <strong>${capturedAmountEuros} €</strong> pour l'intervention <strong>${interventionData.title || interventionData.category}</strong> a été débité avec succès.</p>
                  <p>Merci pour votre travail !</p>
                  <p>L'équipe Depan.Pro</p>`,
              }),
            });
            console.log("Technician payment email sent");
          } catch (emailErr) {
            console.error("Failed to send technician email:", emailErr);
          }
        }

        // Send SMS notification to technician
        const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");
        if (twilioSid && twilioAuth && twilioPhone && techData?.phone) {
          try {
            const smsBody = `Depan.Pro: Paiement de ${capturedAmountEuros} € confirmé pour l'intervention ${interventionData.title || interventionData.category}.`;
            await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
              },
              body: new URLSearchParams({
                To: techData.phone,
                From: twilioPhone,
                Body: smsBody,
              }),
            });
            console.log("Technician payment SMS sent");
          } catch (smsErr) {
            console.error("Failed to send technician SMS:", smsErr);
          }
        }
      }
    } catch (notifyErr) {
      console.error("Failed to notify technician:", notifyErr);
    }

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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface RefundRequest {
  disputeId: string;
  interventionId: string;
  refundType: "full" | "partial";
  refundAmount?: number; // in euros, required for partial
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { disputeId, interventionId, refundType, refundAmount }: RefundRequest = await req.json();

    console.log("[REFUND] Processing refund:", { disputeId, interventionId, refundType, refundAmount });

    // Get the payment authorization for this intervention
    const { data: auth, error: authError } = await supabase
      .from("payment_authorizations")
      .select("*")
      .eq("intervention_id", interventionId)
      .eq("status", "captured")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (authError || !auth) {
      throw new Error("Aucun paiement capturé trouvé pour cette intervention");
    }

    if (!auth.provider_payment_id) {
      throw new Error("Aucun identifiant de paiement Stripe trouvé");
    }

    console.log("[REFUND] Found payment authorization:", auth.id, "PaymentIntent:", auth.provider_payment_id);

    // Calculate refund amount in cents
    let refundAmountCents: number;

    if (refundType === "full") {
      // For full refund, get the captured amount from metadata or use authorized amount
      const capturedAmount = (auth.metadata as Record<string, unknown>)?.captured_amount;
      refundAmountCents = typeof capturedAmount === "number" 
        ? capturedAmount 
        : Math.round(auth.amount_authorized * 100);
      console.log("[REFUND] Full refund amount (cents):", refundAmountCents);
    } else {
      if (!refundAmount || refundAmount <= 0) {
        throw new Error("Le montant du remboursement partiel doit être supérieur à 0");
      }
      refundAmountCents = Math.round(refundAmount * 100);
      console.log("[REFUND] Partial refund amount (cents):", refundAmountCents);
    }

    // Process refund via Stripe
    const refund = await stripe.refunds.create({
      payment_intent: auth.provider_payment_id,
      amount: refundAmountCents,
      reason: "requested_by_customer",
    });

    console.log("[REFUND] Stripe refund created:", refund.id, "Status:", refund.status);

    if (refund.status !== "succeeded" && refund.status !== "pending") {
      throw new Error(`Le remboursement Stripe a échoué avec le statut: ${refund.status}`);
    }

    // Update the dispute with refund info
    const refundAmountEuros = refundAmountCents / 100;
    const { error: updateError } = await supabase
      .from("disputes")
      .update({
        refund_type: refundType,
        refund_amount: refundAmountEuros,
        refund_stripe_id: refund.id,
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolution: refundType === "full"
          ? `Remboursement total de ${refundAmountEuros.toFixed(2)} €`
          : `Geste commercial : remboursement partiel de ${refundAmountEuros.toFixed(2)} €`,
      } as Record<string, unknown>)
      .eq("id", disputeId);

    if (updateError) {
      console.error("[REFUND] Error updating dispute:", updateError);
      // Refund was already processed, log but don't fail
    }

    // Send notification to client
    try {
      const { data: intervention } = await supabase
        .from("interventions")
        .select("client_email, client_phone, title, category, client_id")
        .eq("id", interventionId)
        .single();

      if (intervention) {
        let clientEmail = intervention.client_email;
        let clientPhone = intervention.client_phone;

        if (intervention.client_id) {
          const { data: clientData } = await supabase
            .from("users")
            .select("email, phone, first_name")
            .eq("id", intervention.client_id)
            .single();
          if (clientData) {
            clientEmail = clientEmail || clientData.email;
            clientPhone = clientPhone || clientData.phone;
          }
        }

        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");

        if (resendApiKey && resendFromEmail && clientEmail) {
          const typeLabel = refundType === "full" ? "total" : "partiel";
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: resendFromEmail,
              to: [clientEmail],
              subject: `💰 Remboursement ${typeLabel} - ${refundAmountEuros.toFixed(2)} €`,
              html: `<p>Bonjour,</p>
                <p>Suite à votre litige concernant l'intervention <strong>${intervention.title || intervention.category}</strong>, nous avons procédé à un remboursement ${typeLabel} de <strong>${refundAmountEuros.toFixed(2)} €</strong>.</p>
                <p>Ce montant sera crédité sur votre compte sous 5 à 10 jours ouvrés.</p>
                <p>Cordialement,<br/>L'équipe Depan.Pro</p>`,
            }),
          });
          console.log("[REFUND] Client notification email sent");
        }
      }
    } catch (notifyErr) {
      console.error("[REFUND] Failed to notify client:", notifyErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
        amount: refundAmountEuros,
        status: refund.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[REFUND] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

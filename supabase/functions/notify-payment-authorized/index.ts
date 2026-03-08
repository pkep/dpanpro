import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { buildPaymentAuthorizedTechEmailHtml } from "../_shared/email-templates/payment-authorized-tech.ts";
import { sendSMS } from "../_shared/sms/twilio.ts";
import { buildPaymentAuthorizedTechSms } from "../_shared/sms/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const CATEGORY_LABELS: Record<string, string> = {
  locksmith: "Serrurerie",
  plumbing: "Plomberie",
  electricity: "Électricité",
  glazing: "Vitrerie",
  heating: "Chauffage",
  aircon: "Climatisation",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interventionId } = await req.json();

    if (!interventionId) {
      throw new Error("Missing interventionId");
    }

    console.log("[NOTIFY-PAYMENT-AUTHORIZED] For intervention:", interventionId);

    // Get intervention details
    const { data: intervention, error: intError } = await supabase
      .from("interventions")
      .select("id, technician_id, tracking_code, category, address, city, postal_code, title")
      .eq("id", interventionId)
      .single();

    if (intError || !intervention) {
      throw new Error("Intervention not found");
    }

    if (!intervention.technician_id) {
      console.log("[NOTIFY-PAYMENT-AUTHORIZED] No technician assigned, skipping");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get technician contact info
    const { data: technician } = await supabase
      .from("users")
      .select("email, phone, first_name")
      .eq("id", intervention.technician_id)
      .single();

    if (!technician) {
      throw new Error("Technician not found");
    }

    const categoryLabel = CATEGORY_LABELS[intervention.category] || intervention.category;
    const trackingCode = intervention.tracking_code || "N/A";

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || "";
    const frontendUrl = `https://${projectRef.slice(0, 8)}-preview--${projectRef}.lovable.app`;
    const interventionUrl = `${frontendUrl}/technician/intervention/${interventionId}`;

    const results = { sms: false, email: false };

    // Send SMS
    if (technician.phone) {
      results.sms = await sendSMS(
        technician.phone,
        buildPaymentAuthorizedTechSms({ trackingCode, categoryLabel, city: intervention.city }),
        "[NOTIFY-PAYMENT-AUTHORIZED]"
      );
    }

    // Send Email
    if (technician.email) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
        const emailHtml = buildPaymentAuthorizedTechEmailHtml({
          trackingCode,
          categoryLabel,
          address: intervention.address,
          city: intervention.city,
          interventionUrl,
        });

        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `Depan.Pro <${fromEmail}>`,
              to: [technician.email],
              subject: `✅ Paiement autorisé - ${categoryLabel} à ${intervention.city}`,
              html: emailHtml,
            }),
          });

          results.email = response.ok;
          if (!response.ok) {
            console.error("[NOTIFY-PAYMENT-AUTHORIZED] Email error:", await response.text());
          }
        } catch (e) {
          console.error("[NOTIFY-PAYMENT-AUTHORIZED] Email exception:", e);
        }
      }
    }

    console.log("[NOTIFY-PAYMENT-AUTHORIZED] Results:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[NOTIFY-PAYMENT-AUTHORIZED] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

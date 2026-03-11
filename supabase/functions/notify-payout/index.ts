import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { buildPayoutNotificationEmailHtml } from "../_shared/email-templates/payout-notification.ts";
import { sendSMS } from "../_shared/sms/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface PayoutNotification {
  technicianId: string;
  amount: number;
  grossRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  periodLabel: string;
  payoutDate: string;
}

interface NotifyPayoutRequest {
  payouts: PayoutNotification[];
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return false;
  }

  try {
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Depan.Pro <${fromEmail}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (response.ok) {
      console.log(`Email sent to ${to}`);
      return true;
    }
    const err = await response.text();
    console.error(`Resend error for ${to}:`, err);
    return false;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payouts }: NotifyPayoutRequest = await req.json();

    if (!payouts || payouts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No payouts to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ technicianId: string; email: boolean; sms: boolean }> = [];

    for (const payout of payouts) {
      // Fetch technician info
      const { data: tech, error: techError } = await supabase
        .from("users")
        .select("first_name, last_name, email, phone")
        .eq("id", payout.technicianId)
        .single();

      if (techError || !tech) {
        console.error(`Technician ${payout.technicianId} not found:`, techError);
        results.push({ technicianId: payout.technicianId, email: false, sms: false });
        continue;
      }

      const techName = `${tech.first_name} ${tech.last_name}`;
      const result = { technicianId: payout.technicianId, email: false, sms: false };

      // Send email
      if (tech.email) {
        const formatCurrency = (n: number) =>
          new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

        const subject = `Depan.Pro : Versement de ${formatCurrency(payout.amount)} validé — ${payout.periodLabel}`;
        const html = buildPayoutNotificationEmailHtml({
          technicianName: techName,
          amount: payout.amount,
          periodLabel: payout.periodLabel,
          payoutDate: payout.payoutDate,
          grossRevenue: payout.grossRevenue,
          commissionRate: payout.commissionRate,
          commissionAmount: payout.commissionAmount,
        });
        result.email = await sendEmail(tech.email, subject, html);
      }

      // Send SMS
      if (tech.phone) {
        const formatCurrency = (n: number) =>
          new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

        const smsMessage = `💰 Depan.Pro: Votre versement de ${formatCurrency(payout.amount)} pour ${payout.periodLabel} a été validé. Virement sous 2-3 jours ouvrés.`;
        result.sms = await sendSMS(tech.phone, smsMessage, "[Payout]");
      }

      results.push(result);
      console.log(`Notified ${techName}: email=${result.email}, sms=${result.sms}`);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-payout:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

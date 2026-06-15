import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendSMS } from "../_shared/sms/twilio.ts";
import { buildScheduledReminderSms } from "../_shared/sms/templates.ts";
import { buildScheduledReminderEmail } from "../_shared/email-templates/scheduled-reminder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  interventionId: string;
  technicianId: string;
  technicianFirstName: string;
  technicianEmail?: string | null;
  technicianPhone?: string | null;
  interventionTitle: string;
  interventionAddress: string;
  interventionCity: string;
  interventionPostalCode: string;
  scheduled_at: string;
  trackingCode: string;
  trackingUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: RequestBody = await req.json();
    console.log("[ScheduledReminder] Reminding technician", body.technicianId, "for intervention", body.interventionId);

    const results = { email: false, sms: false };

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (resendApiKey && body.technicianEmail) {
      try {
        const resend = new Resend(resendApiKey);
        const { subject, html } = buildScheduledReminderEmail({
          technicianFirstName: body.technicianFirstName,
          interventionTitle: body.interventionTitle,
          interventionAddress: body.interventionAddress,
          interventionCity: body.interventionCity,
          interventionPostalCode: body.interventionPostalCode,
          scheduledAt: body.scheduled_at,
          trackingCode: body.trackingCode,
          trackingUrl: body.trackingUrl,
        });
        await resend.emails.send({
          from: `Depan.Pro <${fromEmail}>`,
          to: [body.technicianEmail],
          subject,
          html,
        });
        results.email = true;
      } catch (e) {
        console.error("[ScheduledReminder] Email error:", e);
      }
    }

    if (body.technicianPhone) {
      const sms = buildScheduledReminderSms({
        technicianFirstName: body.technicianFirstName,
        interventionTitle: body.interventionTitle,
        scheduledAt: body.scheduled_at,
        address: body.interventionAddress,
        city: body.interventionCity,
        postalCode: body.interventionPostalCode,
        trackingCode: body.trackingCode,
      });
      results.sms = await sendSMS(body.technicianPhone, sms, "[ScheduledReminder]");
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[ScheduledReminder] Error:", error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

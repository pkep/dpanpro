/**
 * send-suspension-reminders
 *
 * Envoie les rappels J-3/J-2/J-1 d'une intervention suspendue (email au technicien).
 * Annule les rappels devenus obsolètes (intervention plus suspendue).
 * À déclencher périodiquement (pg_cron / Scheduled Function), ex. toutes les minutes.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildSuspensionReminderEmail } from "../_shared/email-templates/suspension-reminder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUSPENDED_TYPES = ["SUSPENDED_J3", "SUSPENDED_J2", "SUSPENDED_J1"];

function daysFor(type: string): number {
  return type === "SUSPENDED_J3" ? 3 : type === "SUSPENDED_J2" ? 2 : 1;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const frontendUrl = Deno.env.get("FRONTEND_URL") ?? "https://dpanpro.lovable.app";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const nowIso = new Date().toISOString();

    const { data: due, error } = await supabase
      .from("scheduled_reminders")
      .select("id, intervention_id, reminder_type, scheduled_for")
      .eq("status", "PENDING")
      .in("reminder_type", SUSPENDED_TYPES)
      .lte("scheduled_for", nowIso);

    if (error) throw error;

    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    let sent = 0;
    let cancelled = 0;

    for (const reminder of due ?? []) {
      const row = reminder as { id: string; intervention_id: string; reminder_type: string };

      const { data: intervention } = await supabase
        .from("interventions")
        .select("status, title, address, postal_code, city, suspension_reason, expected_completion_date, tracking_code, technician_id")
        .eq("id", row.intervention_id)
        .maybeSingle();

      if (!intervention || (intervention as { status?: string }).status !== "suspended") {
        await supabase.from("scheduled_reminders").update({ status: "CANCELLED" }).eq("id", row.id);
        cancelled++;
        continue;
      }

      const tech = (intervention as { technician_id?: string | null }).technician_id;
      let email: string | null = null;
      let firstName = "";
      if (tech) {
        const { data: user } = await supabase
          .from("users")
          .select("first_name, email")
          .eq("id", tech)
          .maybeSingle();
        email = (user as { email?: string } | null)?.email ?? null;
        firstName = (user as { first_name?: string } | null)?.first_name ?? "";
      }

      if (!resend || !email) {
        await supabase.from("scheduled_reminders").update({ status: "CANCELLED" }).eq("id", row.id);
        cancelled++;
        continue;
      }

      const i = intervention as Record<string, string | null>;
      const { subject, html } = buildSuspensionReminderEmail({
        firstName,
        interventionTitle: i.title ?? "",
        address: i.address ?? "",
        postalCode: i.postal_code ?? "",
        city: i.city ?? "",
        suspensionReason: i.suspension_reason,
        expectedDate: i.expected_completion_date ?? "",
        trackingCode: i.tracking_code,
        trackingUrl: `${frontendUrl}/technician`,
        daysRemaining: daysFor(row.reminder_type),
      });

      await resend.emails.send({ from: `Depan.Pro <${fromEmail}>`, to: [email], subject, html });
      await supabase
        .from("scheduled_reminders")
        .update({ status: "SENT", sent_at: new Date().toISOString() })
        .eq("id", row.id);
      sent++;
    }

    return new Response(JSON.stringify({ sent, cancelled, total: due?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[SendSuspensionReminders] Error:", error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

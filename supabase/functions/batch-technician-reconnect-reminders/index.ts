import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@depan-pro.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const runId = crypto.randomUUID();
  await supabase.from("job_runs").insert({ id: runId, job_name: "technicianReconnectReminderJob", status: "running" });

  try {
    const threshold = new Date(Date.now() - 3 * 24 * 3600 * 1000);
    const { data: apps, error: appError } = await supabase
      .from("partner_applications")
      .select("user_id, validated_at")
      .eq("status", "approved")
      .not("user_id", "is", null);
    if (appError) throw appError;

    const userIds = (apps || []).map((a: any) => a.user_id).filter(Boolean);
    if (userIds.length === 0) {
      await supabase.from("job_runs").update({ status: "success", finished_at: new Date().toISOString(), processed_count: 0 }).eq("id", runId);
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: users, error } = await supabase
      .from("users")
      .select("id, first_name, email, last_login_at, created_at, is_active, role")
      .in("id", userIds)
      .eq("is_active", true)
      .eq("role", "technician");
    if (error) throw error;

    const { data: reminders } = await supabase
      .from("technician_reconnect_reminders")
      .select("technician_id")
      .gt("sent_at", threshold.toISOString());
    const recentlyReminded = new Set((reminders || []).map((r: any) => r.technician_id));

    const frontendUrl = (Deno.env.get("FRONTEND_URL") || "https://depan.pro").replace(/\/+$/, "");
    const appEnv = Deno.env.get("APP_ENV") ?? "production";
    const testMode = Deno.env.get("EMAIL_TEST_MODE") === "true";
    const testRecipient = Deno.env.get("EMAIL_TEST_RECIPIENT")?.trim();
    const override = testMode && (appEnv === "development" || appEnv === "staging") && !!testRecipient;
    let sent = 0;
    for (const user of users || []) {
      if (!user.email || recentlyReminded.has(user.id)) continue;
      const app = (apps || []).find((a: any) => a.user_id === user.id);
      const reference = user.last_login_at || app?.validated_at || user.created_at;
      if (reference && new Date(reference) > threshold) continue;

      try {
        const response = await resend.emails.send({
          from: `Depan.Pro <${fromEmail}>`,
          to: [override ? testRecipient : user.email],
          subject: `${override ? "[TEST " + appEnv + "] " : ""}Depan.Pro — Reconnectez-vous et activez votre position`,
          html: `<div style="font-family:Arial,sans-serif;color:#1f2937">
            <h2>Bonjour ${user.first_name || ""},</h2>
            <p>Vous ne vous êtes pas connecté depuis plusieurs jours.</p>
            <p>Reconnectez-vous et autorisez la localisation pour recevoir les interventions proches de vous.</p>
            <p><a href="${frontendUrl}/technician" style="background:#0FB87F;color:#fff;padding:12px 20px;text-decoration:none;border-radius:8px">Me reconnecter</a></p>
          </div>`,
        });
        if (response.error) continue;
        await supabase.from("technician_reconnect_reminders").insert({ technician_id: user.id });
        sent++;
      } catch (e) {
        console.error("reconnect reminder failed", user.id, e);
      }
    }

    await supabase.from("job_runs").update({
      status: "success", finished_at: new Date().toISOString(), processed_count: sent,
    }).eq("id", runId);
    return new Response(JSON.stringify({ sent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    await supabase.from("job_runs").update({
      status: "failed", finished_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : String(error),
    }).eq("id", runId);
    return new Response(JSON.stringify({ error: "batch failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

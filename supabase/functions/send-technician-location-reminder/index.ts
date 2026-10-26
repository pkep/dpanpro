import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@depan-pro.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { technicianIds } = await req.json();
    if (!Array.isArray(technicianIds) || technicianIds.length === 0) {
      return new Response(JSON.stringify({ error: "technicianIds requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: users, error } = await supabase
      .from("users")
      .select("id, first_name, email, is_active, role")
      .in("id", technicianIds)
      .eq("is_active", true)
      .eq("role", "technician");
    if (error) throw error;

    const frontendUrl = (Deno.env.get("FRONTEND_URL") || "https://depan.pro").replace(/\/+$/, "");
    const appEnv = Deno.env.get("APP_ENV") ?? "production";
    const testMode = Deno.env.get("EMAIL_TEST_MODE") === "true";
    const testRecipient = Deno.env.get("EMAIL_TEST_RECIPIENT")?.trim();
    const override = testMode && (appEnv === "development" || appEnv === "staging") && !!testRecipient;
    let sent = 0;
    let failed = 0;
    const skipped = technicianIds.length - (users || []).length;

    for (const user of users || []) {
      if (!user.email) { failed++; continue; }
      try {
        const response = await resend.emails.send({
          from: `Depan.Pro <${fromEmail}>`,
          to: [override ? testRecipient : user.email],
          subject: `${override ? "[TEST " + appEnv + "] " : ""}Depan.Pro — Activez votre position pour recevoir des interventions`,
          html: `
            <div style="font-family:Arial,sans-serif;color:#1f2937">
              <h2>Bonjour ${user.first_name || ""},</h2>
              <p>Votre compte technicien n’a pas de position GPS enregistrée. Sans position,
              vous ne pouvez pas recevoir les interventions proches de vous.</p>
              <p><strong>Connectez-vous et autorisez la localisation dans votre navigateur.</strong></p>
              <p><a href="${frontendUrl}/technician" style="background:#0FB87F;color:#fff;padding:12px 20px;
              text-decoration:none;border-radius:8px">Me connecter</a></p>
            </div>`,
        });
        if (response.error) failed++; else sent++;
      } catch (e) {
        console.error("location reminder email failed", user.id, e);
        failed++;
      }
    }
    return new Response(JSON.stringify({ sent, failed, skipped }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-technician-location-reminder error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

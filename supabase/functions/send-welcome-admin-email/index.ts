import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildWelcomeAdminEmailHtml } from "../_shared/email-templates/welcome-admin.ts";
import { buildLoginUrl } from "../_shared/app-url.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@depan-pro.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "manager" | "b2b";
  tempPassword: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, role, tempPassword }: WelcomeEmailRequest = await req.json();

    if (!email || !firstName || !role || !tempPassword) {
      return new Response(JSON.stringify({ error: "Champs requis manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roleLabel = role === "admin"
      ? "Administrateur"
      : role === "b2b"
        ? "Partenaire B2B"
        : "Manager";

    // TEMP TEST OVERRIDE — non-production only, removed after the test campaign.
    const appEnv = Deno.env.get("APP_ENV") ?? "production";
    const testRecipient = Deno.env.get("EMAIL_TEST_RECIPIENT")?.trim();
    const testMode = Deno.env.get("EMAIL_TEST_MODE") === "true";
    const nonProd = appEnv === "development" || appEnv === "staging";
    const overridden = testMode && nonProd && !!testRecipient;
    const recipient = overridden ? testRecipient! : email;
    const subjectPrefix = overridden ? `[TEST ${appEnv}] ` : "";
    if (overridden) {
      console.log(`[welcome-email] test override active: ${email} -> ${recipient} (env=${appEnv})`);
    }

    const emailResponse = await resend.emails.send({
      from: `Depan.Pro <${fromEmail}>`,
      to: [recipient],
      subject: `${subjectPrefix}Depan.Pro : Bienvenue - Votre compte ${roleLabel}`,
      html: buildWelcomeAdminEmailHtml({ firstName, email, roleLabel, tempPassword, loginUrl: buildLoginUrl() }),
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(JSON.stringify({ error: error.message || "Erreur lors de l'envoi de l'email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

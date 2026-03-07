import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildWelcomeAdminEmailHtml } from "../_shared/email-templates/welcome-admin.ts";

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
  role: "admin" | "manager";
  tempPassword: string;
  loginUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, role, tempPassword, loginUrl }: WelcomeEmailRequest = await req.json();

    if (!email || !firstName || !lastName || !role || !tempPassword) {
      return new Response(JSON.stringify({ error: "Champs requis manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roleLabel = role === "admin" ? "Administrateur" : "Manager";

    const emailResponse = await resend.emails.send({
      from: `Dépan.Pro <${fromEmail}>`,
      to: [email],
      subject: `Bienvenue sur Dépan.Pro - Votre compte ${roleLabel}`,
      html: buildWelcomeAdminEmailHtml({ firstName, email, roleLabel, tempPassword, loginUrl }),
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

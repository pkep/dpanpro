import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { buildTechnicianApplicationEmailHtml } from "../_shared/email-templates/technician-application.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(resendApiKey);

    const siteUrl = Deno.env.get("FRONTEND_URL") || "https://dpanpro.lovable.app";
    const { subject, html } = buildTechnicianApplicationEmailHtml({
      firstName: "MG Serrurerie Mayran",
      action: "approved",
      activationUrl: `${siteUrl}/verify-email?token=PLACEHOLDER`,
    });

    const result = await resend.emails.send({
      from: resendFromEmail,
      to: ["k3pcontact@gmail.com", "kpaulimus@depan.pro"],
      subject: `[Copie - destinataire initial: mgserrureriemayran@gmail.com] ${subject}`,
      html,
    });

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

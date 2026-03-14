import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildTechnicianApplicationEmailHtml } from "../_shared/email-templates/technician-application.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyApplicationRequest {
  technicianId: string;
  action: 'accepted' | 'rejected';
  email: string;
  firstName: string;
  reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (!resendApiKey) {
      console.log('[NotifyTechnicianApplication] Resend not configured');
      return new Response(
        JSON.stringify({ success: true, message: "Email not sent - Resend not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(resendApiKey as string);
    const { technicianId, action, email, firstName, reason }: NotifyApplicationRequest = await req.json();

    console.log(`[NotifyTechnicianApplication] Sending ${action} email to ${email}`);

    let activationUrl: string | undefined;

    // For accepted technicians, generate an activation token
    if (action === 'accepted') {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Generate a random 9-character token
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
      let token = "";
      for (let i = 0; i < 9; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Invalidate any existing unused tokens for this user
      await supabase
        .from("email_verification_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("user_id", technicianId)
        .is("used_at", null);

      // Create new token with 15min expiry
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const { error: tokenError } = await supabase
        .from("email_verification_tokens")
        .insert({
          user_id: technicianId,
          token,
          expires_at: expiresAt,
        });

      if (tokenError) {
        console.error("Token creation error:", tokenError);
        throw new Error("Failed to create activation token");
      }

      const siteUrl = "https://dpanpro.lovable.app";
      activationUrl = `${siteUrl}/verify-email?token=${token}`;
      console.log(`[NotifyTechnicianApplication] Activation URL generated for ${email}`);
    }

    const { subject, html: htmlContent } = buildTechnicianApplicationEmailHtml({
      firstName,
      action,
      reason,
      activationUrl,
    });

    const emailResponse = await resend.emails.send({
      from: `Depan.Pro <${resendFromEmail}>`,
      to: [email],
      subject,
      html: htmlContent,
    });

    console.log(`[NotifyTechnicianApplication] Email sent:`, emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[NotifyTechnicianApplication] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

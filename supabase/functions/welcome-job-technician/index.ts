import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildWelcomeJobTechnicianHtml } from "../_shared/email-templates/welcome-job-technician.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  technicianId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { technicianId }: RequestBody = await req.json();

    if (!technicianId) {
      return new Response(JSON.stringify({ error: "technicianId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email, first_name, last_name")
      .eq("id", technicianId)
      .maybeSingle();

    if (userError || !user) {
      console.error("[WelcomeJobTechnician] User not found:", userError);
      return new Response(JSON.stringify({ error: "Technician not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (!resendApiKey) {
      console.log("[WelcomeJobTechnician] Resend not configured");
      return new Response(JSON.stringify({ success: true, message: "Email not sent - Resend not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(resendApiKey);

    const { subject, html } = buildWelcomeJobTechnicianHtml({
      firstName: user.first_name || "",
      lastName: user.last_name || "",
    });

    const emailResponse = await resend.emails.send({
      from: `Depan.Pro <${resendFromEmail}>`,
      to: [user.email],
      subject,
      html,
    });

    console.log(`[WelcomeJobTechnician] Email sent to ${user.email}:`, emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[WelcomeJobTechnician] Error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

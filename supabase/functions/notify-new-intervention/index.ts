import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildNotifyNewInterventionHtml } from "../_shared/email-templates/notify-new-intervention.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  interventionId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  locksmith: "serrurier",
  plumbing: "plombier",
  electricity: "électricien",
  glazing: "vitrier",
  heating: "chauffagiste",
  aircon: "climaticien",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interventionId }: RequestBody = await req.json();

    if (!interventionId) {
      return new Response(JSON.stringify({ error: "interventionId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: intervention, error: intError } = await supabase
      .from("interventions")
      .select("id, category, client_id, client_email")
      .eq("id", interventionId)
      .maybeSingle();

    if (intError || !intervention) {
      console.error("[NotifyNewIntervention] Intervention not found:", intError);
      return new Response(JSON.stringify({ error: "Intervention not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let recipientEmail: string | null = intervention.client_email || null;

    if (!recipientEmail && intervention.client_id) {
      const { data: user } = await supabase
        .from("users")
        .select("email")
        .eq("id", intervention.client_id)
        .maybeSingle();
      recipientEmail = user?.email || null;
    }

    if (!recipientEmail) {
      console.log("[NotifyNewIntervention] No recipient email found");
      return new Response(JSON.stringify({ success: true, message: "No recipient email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const domain = CATEGORY_LABELS[intervention.category] || intervention.category;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (!resendApiKey) {
      console.log("[NotifyNewIntervention] Resend not configured");
      return new Response(
        JSON.stringify({ success: true, message: "Email not sent - Resend not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(resendApiKey);

    const { subject, html } = buildNotifyNewInterventionHtml({ domain });

    const emailResponse = await resend.emails.send({
      from: `Depan.Pro <${resendFromEmail}>`,
      to: [recipientEmail],
      subject,
      html,
    });

    console.log(`[NotifyNewIntervention] Email sent to ${recipientEmail}:`, emailResponse);

    return new Response(JSON.stringify({ success: true, recipient: recipientEmail, emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[NotifyNewIntervention] Error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isB2bIntervention, b2bSkippedResponse } from "../_shared/notify/guard.ts";
import { buildEscalationClimbedInternalEmailHtml } from "../_shared/email-templates/escalation-climbed.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  /** Intervention escaladée (parente de préférence). */
  interventionId: string;
  /** Nom du technicien assigné (optionnel). */
  technicianName?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interventionId, technicianName }: RequestBody = await req.json();
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

    // B2B : pas de communication vers le client final
    if (await isB2bIntervention(supabase, interventionId)) return b2bSkippedResponse(corsHeaders);

    const { data: raw, error } = await supabase
      .from("interventions")
      .select("id, title, tracking_code, address, city, postal_code, client_id, client_email, parent_id_intervention")
      .eq("id", interventionId)
      .maybeSingle();

    if (error || !raw) {
      console.error("[NotifyEscalationClimbedInternal] Intervention not found:", error);
      return new Response(JSON.stringify({ error: "Intervention not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Si on notifie depuis l'enfant, on affiche les infos de l'intervention parente (originelle).
    let intervention = raw;
    if (raw.parent_id_intervention) {
      const { data: parent } = await supabase
        .from("interventions")
        .select("id, title, tracking_code, address, city, postal_code, client_id, client_email, parent_id_intervention")
        .eq("id", raw.parent_id_intervention)
        .maybeSingle();
      if (parent) intervention = parent;
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
      return new Response(JSON.stringify({ success: true, message: "No recipient email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: true, message: "Email not sent - Resend not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = Deno.env.get("FRONTEND_URL") || "https://depan.pro";
    const { subject, html } = buildEscalationClimbedInternalEmailHtml({
      intervention: {
        id: intervention.id,
        title: intervention.title,
        trackingCode: intervention.tracking_code,
        address: intervention.address,
        city: intervention.city,
        postalCode: intervention.postal_code,
      },
      technicianName: technicianName ?? null,
      baseUrl,
    });

    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(resendApiKey);
    const emailResponse = await resend.emails.send({
      from: `Depan.Pro <${resendFromEmail}>`,
      to: [recipientEmail],
      subject,
      html,
    });

    console.log(`[NotifyEscalationClimbedInternal] Email sent to ${recipientEmail}`, emailResponse);
    return new Response(JSON.stringify({ success: true, recipient: recipientEmail }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[NotifyEscalationClimbedInternal] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

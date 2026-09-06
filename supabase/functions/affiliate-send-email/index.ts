import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildAffiliateQrCodeEmailHtml } from "../_shared/email-templates/affiliate-qr-code.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  affiliateId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;
    const { affiliateId } = body;

    if (!affiliateId) {
      return new Response(JSON.stringify({ error: "affiliateId est requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@depan-pro.com";
    const frontendUrl = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || "https://depan.pro";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: affiliate, error: fetchError } = await supabase
      .from("affiliates")
      .select("id, first_name, last_name, email, phone, code, commission_type, commission_value")
      .eq("id", affiliateId)
      .single();

    if (fetchError || !affiliate) {
      console.error("[affiliate-send-email] Affiliate not found:", fetchError);
      return new Response(JSON.stringify({ error: "Affilié introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!affiliate.email) {
      return new Response(JSON.stringify({ error: "L'affilié n'a pas d'email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const referralUrl = `${frontendUrl}/new-intervention?ref=${affiliate.code}`;

    const html = buildAffiliateQrCodeEmailHtml({
      firstName: affiliate.first_name,
      lastName: affiliate.last_name,
      code: affiliate.code,
      referralUrl,
      commissionType: affiliate.commission_type,
      commissionValue: String(affiliate.commission_value),
    });

    if (!resendApiKey) {
      console.warn("[affiliate-send-email] RESEND_API_KEY not set — skipping email send");
      return new Response(JSON.stringify({ success: true, warning: "Email not sent — RESEND_API_KEY missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Depan.Pro <${fromEmail}>`,
        to: affiliate.email,
        subject: `Votre QR Code affilié Depan.Pro — ${affiliate.code}`,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error("[affiliate-send-email] Resend error:", errText);
      return new Response(JSON.stringify({ error: "Échec de l'envoi de l'email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[affiliate-send-email] error:", err);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

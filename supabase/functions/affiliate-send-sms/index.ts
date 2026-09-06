import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendMMS } from "../_shared/sms/twilio.ts";
import { buildAffiliateWelcomeSms } from "../_shared/sms/templates.ts";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: affiliate, error: fetchError } = await supabase
      .from("affiliates")
      .select("id, first_name, last_name, phone, code")
      .eq("id", affiliateId)
      .single();

    if (fetchError || !affiliate) {
      console.error("[affiliate-send-sms] Affiliate not found:", fetchError);
      return new Response(JSON.stringify({ error: "Affilié introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const frontendUrl = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || "https://depan.pro";
    const referralUrl = `${frontendUrl}/new-intervention?ref=${affiliate.code}`;

    const message = buildAffiliateWelcomeSms({
      firstName: affiliate.first_name,
      lastName: affiliate.last_name,
      code: affiliate.code,
      referralUrl,
    });

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(referralUrl)}`;
    const sent = await sendMMS(affiliate.phone, message, qrUrl, "[affiliate-send-sms]");

    if (!sent) {
      return new Response(JSON.stringify({ error: "Échec de l'envoi du SMS" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[affiliate-send-sms] error:", err);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

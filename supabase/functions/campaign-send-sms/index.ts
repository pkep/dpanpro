import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendMMS } from "../_shared/sms/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  campaignId: string;
  /** Numéro fourni depuis l'admin (aucun téléphone stocké sur la campagne). */
  phone: string;
}

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    const campaignId = body.campaignId;
    const phone = body.phone?.trim();
    if (!campaignId || !phone) return json(400, { error: "campaignId et phone sont requis" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: campaign, error } = await supabase
      .from("affiliate_campaign")
      .select("id, name, code")
      .eq("id", campaignId)
      .single();

    if (error || !campaign) {
      console.error("[campaign-send-sms] campaign not found:", error);
      return json(404, { error: "Campagne introuvable" });
    }
    if (!campaign.code) return json(400, { error: "Cette campagne n'a pas de code promo" });

    const frontendUrl = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || "https://depan.pro";
    const promoUrl = `${frontendUrl}/new-intervention?promo=${encodeURIComponent(campaign.code)}`;
    const message = `Depan.Pro — ${campaign.name} : code promo ${campaign.code}. Demandez votre intervention : ${promoUrl}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(promoUrl)}`;

    const sent = await sendMMS(phone, message, qrUrl, "[campaign-send-sms]");
    if (!sent) return json(500, { error: "Échec de l'envoi du SMS" });

    return json(200, { success: true });
  } catch (err) {
    console.error("[campaign-send-sms] error:", err);
    return json(500, { error: "Erreur interne" });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCampaignQrCodeEmailHtml } from "../_shared/email-templates/campaign-qr-code.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QR_CONTENT_ID = "campaign_qr";
const MAX_PDF_BYTES = 10 * 1024 * 1024;

interface RequestBody {
  campaignId: string;
  /** Destinataire fourni depuis l'admin (aucune email stockée sur la campagne). */
  email: string;
  pdfBase64?: string;
  pdfFileName?: string;
  qrPngBase64?: string;
}

interface ResendAttachment {
  filename: string;
  content: string;
  content_type?: string;
  content_id?: string;
}

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeBase64(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const stripped = value.includes(",") && value.startsWith("data:") ? value.slice(value.indexOf(",") + 1) : value;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(stripped)) throw new Error("base64 invalide");
  return stripped;
}

function base64Bytes(b64: string): number {
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    const campaignId = body.campaignId;
    const email = body.email?.trim();
    if (!campaignId || !email) return json(400, { error: "campaignId et email sont requis" });

    let pdfBase64: string | undefined;
    let qrPngBase64: string | undefined;
    try {
      pdfBase64 = normalizeBase64(body.pdfBase64);
      qrPngBase64 = normalizeBase64(body.qrPngBase64);
    } catch (e) {
      return json(400, { error: (e as Error).message });
    }
    if (pdfBase64 && base64Bytes(pdfBase64) > MAX_PDF_BYTES) {
      return json(413, { error: "Le PDF dépasse la taille maximale (10 Mo)" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: campaign, error } = await supabase
      .from("affiliate_campaign")
      .select("id, name, code, commission_type, commission_value")
      .eq("id", campaignId)
      .single();

    if (error || !campaign) {
      console.error("[campaign-send-email] campaign not found:", error);
      return json(404, { error: "Campagne introuvable" });
    }
    if (!campaign.code) return json(400, { error: "Cette campagne n'a pas de code promo" });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@depan-pro.com";
    const frontendUrl = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || "https://depan.pro";
    const promoUrl = `${frontendUrl}/new-intervention?promo=${encodeURIComponent(campaign.code)}`;

    const discountLabel = campaign.commission_type === "percentage"
      ? `-${campaign.commission_value}%`
      : `-${Number(campaign.commission_value).toFixed(2)} €`;

    const attachments: ResendAttachment[] = [];
    if (pdfBase64) {
      attachments.push({
        filename: body.pdfFileName?.trim() || `depanpro-campaign-${campaign.code}.pdf`,
        content: pdfBase64,
        content_type: "application/pdf",
      });
    }
    if (qrPngBase64) {
      attachments.push({
        filename: `${QR_CONTENT_ID}.png`,
        content: qrPngBase64,
        content_type: "image/png",
        content_id: QR_CONTENT_ID,
      });
    }

    const html = buildCampaignQrCodeEmailHtml({
      name: campaign.name,
      code: campaign.code,
      promoUrl,
      discountLabel,
      qrContentId: qrPngBase64 ? QR_CONTENT_ID : undefined,
      hasPdfAttachment: Boolean(pdfBase64),
    });

    if (!resendApiKey) {
      console.warn("[campaign-send-email] RESEND_API_KEY not set — skipping email send");
      return json(200, { success: true, warning: "Email not sent — RESEND_API_KEY missing" });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Depan.Pro <${fromEmail}>`,
        to: email,
        subject: `Offre ${campaign.name} — code ${campaign.code}`,
        html,
        ...(attachments.length > 0 ? { attachments } : {}),
      }),
    });

    if (!res.ok) {
      console.error("[campaign-send-email] Resend error:", await res.text());
      return json(500, { error: "Échec de l'envoi de l'email" });
    }

    return json(200, { success: true });
  } catch (err) {
    console.error("[campaign-send-email] error:", err);
    return json(500, { error: "Erreur interne" });
  }
});

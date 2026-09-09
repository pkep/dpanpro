import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildAffiliateQrCodeEmailHtml } from "../_shared/email-templates/affiliate-qr-code.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Content-ID used for the inline QR image (referenced as cid:affiliate_qr in the HTML). */
const QR_CONTENT_ID = "affiliate_qr";

/** Resend hard limit is 40 MB per message; keep a generous but safe cap on the client-provided PDF. */
const MAX_PDF_BYTES = 10 * 1024 * 1024;

interface RequestBody {
  affiliateId: string;
  /**
   * Optional — A5 poster generated client-side (frontend/src/lib/affiliateQrPdf.ts), base64 (no data: prefix).
   * Same pattern as send-invoice-email / send-quote-email.
   */
  pdfBase64?: string;
  /** Optional file name for the PDF; defaults to depanpro-qr-<CODE>.pdf. */
  pdfFileName?: string;
  /** Optional — 250x250 PNG of the QR, base64 (no data: prefix). Embedded inline via content_id. */
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

/** Strips an optional data-URI prefix and validates the base64 alphabet. */
function normalizeBase64(value: string | undefined, label: string): string | undefined {
  if (!value) return undefined;
  const stripped = value.includes(",") && value.startsWith("data:") ? value.slice(value.indexOf(",") + 1) : value;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(stripped)) {
    throw new Error(`${label} n'est pas un base64 valide`);
  }
  return stripped;
}

/** Approximate decoded size of a base64 string. */
function base64Bytes(b64: string): number {
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;
    const { affiliateId } = body;

    if (!affiliateId) {
      return json(400, { error: "affiliateId est requis" });
    }

    let pdfBase64: string | undefined;
    let qrPngBase64: string | undefined;
    try {
      pdfBase64 = normalizeBase64(body.pdfBase64, "pdfBase64");
      qrPngBase64 = normalizeBase64(body.qrPngBase64, "qrPngBase64");
    } catch (e) {
      return json(400, { error: (e as Error).message });
    }
    if (pdfBase64 && base64Bytes(pdfBase64) > MAX_PDF_BYTES) {
      return json(413, { error: "Le PDF dépasse la taille maximale autorisée (10 Mo)" });
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
      return json(404, { error: "Affilié introuvable" });
    }

    if (!affiliate.email) {
      return json(400, { error: "L'affilié n'a pas d'email" });
    }

    const referralUrl = `${frontendUrl}/new-intervention?ref=${affiliate.code}`;

    // Attachments: A5 poster (regular) + QR PNG (inline, cid:affiliate_qr)
    const attachments: ResendAttachment[] = [];
    if (pdfBase64) {
      attachments.push({
        filename: body.pdfFileName?.trim() || `depanpro-qr-${affiliate.code}.pdf`,
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

    const html = buildAffiliateQrCodeEmailHtml({
      firstName: affiliate.first_name,
      lastName: affiliate.last_name,
      code: affiliate.code,
      referralUrl,
      commissionType: affiliate.commission_type,
      commissionValue: String(affiliate.commission_value),
      qrContentId: qrPngBase64 ? QR_CONTENT_ID : undefined,
      hasPdfAttachment: Boolean(pdfBase64),
    });

    if (!resendApiKey) {
      console.warn("[affiliate-send-email] RESEND_API_KEY not set — skipping email send");
      return json(200, { success: true, warning: "Email not sent — RESEND_API_KEY missing" });
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
        ...(attachments.length > 0 ? { attachments } : {}),
      }),
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error("[affiliate-send-email] Resend error:", errText);
      return json(500, { error: "Échec de l'envoi de l'email" });
    }

    console.log(
      `[affiliate-send-email] sent to ${affiliate.email} (pdf=${Boolean(pdfBase64)}, inlineQr=${Boolean(qrPngBase64)})`,
    );
    return json(200, { success: true, attachments: attachments.length });
  } catch (err) {
    console.error("[affiliate-send-email] error:", err);
    return json(500, { error: "Erreur interne" });
  }
});

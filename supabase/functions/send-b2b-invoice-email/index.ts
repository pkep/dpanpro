/**
 * send-b2b-invoice-email
 *
 * Envoie une facture mensuelle B2B au contact du partenaire (PDF en pièce jointe)
 * puis passe la facture en `sent`. Envoi MANUEL (jamais automatique).
 *
 * body: { invoiceId: string }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildB2bMonthlyInvoiceEmail } from "../_shared/email-templates/b2b-monthly-invoice.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "invoiceId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const { data: invoice, error } = await supabase
      .from("b2b_invoices")
      .select("*, b2b_partners(company_name, contact_email, contact_firstname, contact_lastname, construction_company)")
      .eq("id", invoiceId)
      .single();
    if (error || !invoice) throw new Error("Facture B2B introuvable");

    type PartnerRow = {
      company_name?: string;
      contact_email?: string;
      contact_firstname?: string;
      contact_lastname?: string;
      construction_company?: boolean;
    };
    const partner = (invoice as { b2b_partners?: PartnerRow } & Record<string, unknown>).b2b_partners;
    const vatExempt = partner?.construction_company === true;
    const to = partner?.contact_email;
    if (!to) throw new Error("Aucun e-mail de contact pour ce partenaire");

    const contactName = [partner?.contact_firstname, partner?.contact_lastname].filter(Boolean).join(" ") || partner?.company_name || "";

    // Récupère le PDF stocké
    const attachments: { filename: string; content: string }[] = [];
    if (invoice.pdf_url) {
      try {
        const pdfRes = await fetch(invoice.pdf_url);
        if (pdfRes.ok) {
          const buf = new Uint8Array(await pdfRes.arrayBuffer());
          let binary = "";
          for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
          attachments.push({ filename: `facture-${invoice.number}.pdf`, content: btoa(binary) });
        }
      } catch (e) {
        console.error("[send-b2b-invoice-email] téléchargement PDF échoué:", e);
      }
    }

    const { subject, html } = buildB2bMonthlyInvoiceEmail({
      contactName,
      invoiceNumber: invoice.number,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
      vatExempt,
      totalHt: Number(invoice.total_ht ?? 0),
      totalTtc: Number(invoice.total_ttc ?? 0),
    });

    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: `Depan.Pro <${fromEmail}>`,
      to: [to],
      subject,
      html,
      attachments,
    });

    await supabase.from("b2b_invoices")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", invoiceId);

    return new Response(JSON.stringify({ success: true, to }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-b2b-invoice-email] error:", error);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

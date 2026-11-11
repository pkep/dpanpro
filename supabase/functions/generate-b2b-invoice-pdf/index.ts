/**
 * generate-b2b-invoice-pdf
 *
 * Aperçu **transitoire** du PDF de la facture mensuelle d'un partenaire B2B pour un mois
 * donné, ou régénération d'une facture existante.
 *
 * body:
 *   - { partnerId: string, month: "YYYY-MM", actorId?: string } → aperçu non persisté
 *   - { invoiceId: string } → PDF depuis la facture + lignes (non persisté)
 *   - { invoiceId: string, regenerate: true } → reprend toutes les interventions de la
 *     période (liées ou non), recalcule les lignes/montants, force TVA 0 / TTC = HT,
 *     remplace le PDF stocké et met à jour la facture
 * → { success: true, pdfBase64, filename, pdfUrl?, regenerated?, lines?, totalHt? }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { firstDayOfMonth, lastDayOfMonth, fileDate, b2bInvoicePath } from "../_shared/b2b-period.ts";
import { buildInvoiceB2bMonthlyPdfBase64 } from "../_shared/pdf/invoice-b2b-monthly.ts";
import { buildB2bMonthlyLines } from "../_shared/b2b-lines.ts";
import { computeB2bVat } from "../_shared/b2b-vat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "interventions";

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function mapStoredLine(line: Record<string, unknown>) {
  const details = (line.details && typeof line.details === "object" ? line.details : {}) as Record<string, unknown>;
  return {
    interventionId: String(line.intervention_id ?? ""),
    label: String(line.label ?? "Prestation"),
    amount: Number(line.amount ?? 0),
    interventionDate: typeof details.interventionDate === "string" ? details.interventionDate : null,
    externalRef: typeof details.externalRef === "string" ? details.externalRef : null,
    address: typeof details.address === "string" ? details.address : null,
    interventionDetail: typeof details.interventionDetail === "string" ? details.interventionDetail : null,
    details: Array.isArray(details.details) ? details.details.map(String) : undefined,
    technicianName: typeof details.technicianName === "string" ? details.technicianName : null,
    trackingCode: typeof details.trackingCode === "string" ? details.trackingCode : null,
    perServiceInvoiceNumber: typeof details.perServiceInvoiceNumber === "string" ? details.perServiceInvoiceNumber : null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { partnerId, month, invoiceId, regenerate } = await req.json();
    if (!invoiceId && (!partnerId || !month)) {
      return new Response(JSON.stringify({ error: "partnerId and month required, or invoiceId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Facture déjà générée : téléchargement depuis les lignes stockées, ou régénération complète.
    if (invoiceId) {
      const { data: invoice, error: invErr } = await supabase
        .from("b2b_invoices")
        .select("*, b2b_partners(*)")
        .eq("id", invoiceId)
        .single();
      if (invErr || !invoice) throw new Error("Facture B2B introuvable");

      const partner = (invoice as { b2b_partners?: Record<string, unknown> | null }).b2b_partners ?? null;
      if (!partner) throw new Error("Partenaire B2B introuvable pour cette facture");

      const partnerIdValue = String(invoice.partner_id);
      const periodStart = String(invoice.period_start ?? "");
      const periodEnd = String(invoice.period_end ?? "");
      const number = String(invoice.number ?? "B2B");

      if (regenerate) {
        if (String(invoice.status ?? "") === "cancelled") {
          throw new Error("Impossible de régénérer une facture annulée");
        }
        if (!periodStart || !periodEnd) {
          throw new Error("Période de facturation absente pour cette facture");
        }

        const from = `${periodStart}T00:00:00.000Z`;
        const to = `${periodEnd}T23:59:59.999Z`;

        // Toutes les interventions terminées de la période, déjà liées à cette
        // facture ou encore non facturées (on exclut celles d'une autre facture).
        const { data: interventionRows, error: iErr } = await supabase
          .from("interventions")
          .select("id, category, description, questionnaire_answers, final_price, estimated_price, completed_at, tracking_code, b2b_order_reference, address, postal_code, city, technician_id, invoice_number, b2b_invoice_id")
          .eq("b2b_partner_id", partnerIdValue)
          .eq("status", "completed")
          .gte("completed_at", from)
          .lte("completed_at", to)
          .order("completed_at", { ascending: true });
        if (iErr) throw iErr;

        const interventions = ((interventionRows ?? []) as Record<string, unknown>[])
          .filter((i) => i.b2b_invoice_id == null || String(i.b2b_invoice_id) === String(invoiceId));
        if (interventions.length === 0) {
          throw new Error("Aucune intervention B2B terminée à facturer sur cette période");
        }

        const lines = await buildB2bMonthlyLines(supabase, interventions as any[], partner.construction_company === true);
        const totalHt = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
        const vat = computeB2bVat(totalHt, partner.construction_company === true);

        // Délie les anciennes interventions qui ne font plus partie du périmètre.
        const { data: oldLineRows, error: oldErr } = await supabase
          .from("b2b_invoices_lines")
          .select("intervention_id")
          .eq("invoice_id", invoiceId);
        if (oldErr) throw oldErr;

        const newIds = new Set(lines.map((l) => l.interventionId));
        const oldIds = ((oldLineRows ?? []) as Array<{ intervention_id?: string | null }>)
          .map((l) => l.intervention_id)
          .filter((v): v is string => !!v);
        const toUnlink = oldIds.filter((id) => !newIds.has(id));
        if (toUnlink.length > 0) {
          const { error: unlinkErr } = await supabase
            .from("interventions")
            .update({ b2b_invoice_id: null })
            .in("id", toUnlink)
            .eq("b2b_invoice_id", invoiceId);
          if (unlinkErr) throw unlinkErr;
        }

        const { error: delErr } = await supabase
          .from("b2b_invoices_lines")
          .delete()
          .eq("invoice_id", invoiceId);
        if (delErr) throw delErr;

        const { error: insErr } = await supabase.from("b2b_invoices_lines").insert(
          lines.map((l) => ({
            invoice_id: invoiceId,
            intervention_id: l.interventionId,
            label: l.label,
            amount: l.amount,
            details: {
              interventionDate: l.interventionDate,
              externalRef: l.externalRef,
              address: l.address,
              interventionDetail: l.interventionDetail,
              details: l.details,
              technicianName: l.technicianName,
              trackingCode: l.trackingCode,
              perServiceInvoiceNumber: l.perServiceInvoiceNumber,
            },
          })),
        );
        if (insErr) throw insErr;

        const { error: linkErr } = await supabase
          .from("interventions")
          .update({ b2b_invoice_id: invoiceId })
          .in("id", lines.map((l) => l.interventionId));
        if (linkErr) throw linkErr;

        const pdfBase64 = buildInvoiceB2bMonthlyPdfBase64({
          number,
          generatedAt: invoice.created_at ?? null,
          periodStart,
          periodEnd,
          partner,
          lines,
          totalHt,
          vat: vat.vatAmount,
          totalTtc: vat.totalTtc,
        });

        const path = b2bInvoicePath(
          (partner.company_name as string | null) ?? null,
          partnerIdValue,
          periodEnd,
        );
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(
          path,
          base64ToUint8Array(pdfBase64),
          { contentType: "application/pdf", upsert: true },
        );
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        // Versionne l'URL pour éviter que Cloudflare/CDN serve l'ancien PDF.
        const pdfUrl = `${pub.publicUrl}?v=${Date.now()}`;

        const { error: updErr } = await supabase
          .from("b2b_invoices")
          .update({ total_ht: totalHt, vat_amount: vat.vatAmount, total_ttc: vat.totalTtc, pdf_url: pdfUrl })
          .eq("id", invoiceId);
        if (updErr) throw updErr;

        return new Response(JSON.stringify({
          success: true,
          pdfBase64,
          filename: `facture-${number}.pdf`,
          pdfUrl,
          regenerated: true,
          lines: lines.length,
          totalHt,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Téléchargement seul : construit le PDF depuis les lignes stockées, sans mutation.
      const { data: lineRows, error: lErr } = await supabase
        .from("b2b_invoices_lines")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("id", { ascending: true });
      if (lErr) throw lErr;

      const totalHt = Math.round(Number(invoice.total_ht ?? 0) * 100) / 100;
      const vat = computeB2bVat(totalHt, partner.construction_company === true);
      const pdfBase64 = buildInvoiceB2bMonthlyPdfBase64({
        number,
        generatedAt: invoice.created_at ?? null,
        periodStart,
        periodEnd,
        partner,
        lines: (lineRows ?? []).map((line) => mapStoredLine(line as Record<string, unknown>)),
        totalHt,
        vat: vat.vatAmount,
        totalTtc: vat.totalTtc,
      });

      return new Response(JSON.stringify({
        success: true,
        pdfBase64,
        filename: `facture-${number}.pdf`,
        pdfUrl: (invoice.pdf_url as string | null) ?? null,
        regenerated: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: partner, error: pErr } = await supabase
      .from("b2b_partners")
      .select("id, company_name, siret, vat_number, address, postal_code, city, contact_firstname, contact_lastname, contact_email, contact_phone, construction_company")
      .eq("id", partnerId)
      .single();
    if (pErr || !partner) throw new Error("Partenaire B2B introuvable");

    const periodStart = firstDayOfMonth(month);
    const periodEnd = lastDayOfMonth(month);
    const from = `${periodStart}T00:00:00.000Z`;
    const to = `${periodEnd}T23:59:59.999Z`;

    const { data: interventions, error: iErr } = await supabase
      .from("interventions")
      .select("id, category, description, questionnaire_answers, final_price, estimated_price, completed_at, tracking_code, b2b_order_reference, address, postal_code, city, technician_id, invoice_number")
      .eq("b2b_partner_id", partnerId)
      .is("b2b_invoice_id", null)
      .eq("status", "completed")
      .gte("completed_at", from)
      .lte("completed_at", to)
      .order("completed_at", { ascending: true });
    if (iErr) throw iErr;
    if (!interventions || interventions.length === 0) {
      throw new Error("Aucune intervention B2B terminée à facturer sur cette période");
    }

    const lines = await buildB2bMonthlyLines(supabase, interventions as any[], partner.construction_company === true);
    const totalHt = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    const vat = computeB2bVat(totalHt, partner.construction_company === true);
    const number = `B2B-${month.replace("-", "")}-APERCU`;

    const pdfBase64 = buildInvoiceB2bMonthlyPdfBase64({
      number,
      periodStart,
      periodEnd,
      partner,
      lines,
      totalHt,
      vat: vat.vatAmount,
      totalTtc: vat.totalTtc,
    });

    return new Response(JSON.stringify({
      success: true,
      pdfBase64,
      filename: `invoice-${fileDate(periodEnd)}.pdf`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[generate-b2b-invoice-pdf] error:", error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * generate-b2b-invoice-pdf
 *
 * Aperçu **transitoire** (aucune persistance, aucun stockage) du PDF de la facture mensuelle
 * d'un partenaire B2B pour un mois donné, à partir des interventions terminées non facturées.
 *
 * body: { partnerId: string, month: "YYYY-MM", actorId?: string }
 * → { success: true, pdfBase64, filename }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { firstDayOfMonth, lastDayOfMonth, fileDate } from "../_shared/b2b-period.ts";
import { buildInvoiceB2bMonthlyPdfBase64 } from "../_shared/pdf/invoice-b2b-monthly.ts";
import { buildB2bMonthlyLines } from "../_shared/b2b-lines.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAT_RATE = 0.20;

function mapStoredLine(line: Record<string, unknown>) {
  const details = (line.details && typeof line.details === "object" ? line.details : {}) as Record<string, unknown>;
  return {
    interventionId: String(line.intervention_id ?? ""),
    label: String(line.label ?? "Prestation"),
    amount: Number(line.amount ?? 0),
    interventionDate: typeof details.interventionDate === "string" ? details.interventionDate : null,
    externalRef: typeof details.externalRef === "string" ? details.externalRef : null,
    address: typeof details.address === "string" ? details.address : null,
    details: Array.isArray(details.details) ? details.details.map(String) : undefined,
    technicianName: typeof details.technicianName === "string" ? details.technicianName : null,
    trackingCode: typeof details.trackingCode === "string" ? details.trackingCode : null,
    perServiceInvoiceNumber: typeof details.perServiceInvoiceNumber === "string" ? details.perServiceInvoiceNumber : null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { partnerId, month, invoiceId } = await req.json();
    if (!invoiceId && (!partnerId || !month)) {
      return new Response(JSON.stringify({ error: "partnerId and month required, or invoiceId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Facture déjà générée : régénérer son PDF depuis la facture et ses lignes.
    if (invoiceId) {
      const { data: invoice, error: invErr } = await supabase
        .from("b2b_invoices")
        .select("*, b2b_partners(*)")
        .eq("id", invoiceId)
        .single();
      if (invErr || !invoice) throw new Error("Facture B2B introuvable");

      const { data: lineRows, error: lErr } = await supabase
        .from("b2b_invoices_lines")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("id", { ascending: true });
      if (lErr) throw lErr;

      const partner = (invoice as { b2b_partners?: Record<string, unknown> | null }).b2b_partners ?? null;
      if (!partner) throw new Error("Partenaire B2B introuvable pour cette facture");

      const pdfBase64 = buildInvoiceB2bMonthlyPdfBase64({
        number: String(invoice.number ?? "B2B"),
        generatedAt: invoice.created_at ?? null,
        periodStart: invoice.period_start,
        periodEnd: invoice.period_end,
        partner,
        lines: (lineRows ?? []).map((line) => mapStoredLine(line as Record<string, unknown>)),
        totalHt: Number(invoice.total_ht ?? 0),
        vat: Number(invoice.vat_amount ?? 0),
        totalTtc: Number(invoice.total_ttc ?? 0),
      });

      return new Response(JSON.stringify({
        success: true,
        pdfBase64,
        filename: `facture-${invoice.number ?? invoiceId}.pdf`,
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
      .select("id, category, final_price, estimated_price, completed_at, tracking_code, b2b_order_reference, address, postal_code, city, technician_id, invoice_number")
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

    const lines = await buildB2bMonthlyLines(supabase, interventions as any[]);
    const totalHt = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    // Autoliquidation TVA (sous-traitance BTP) : pas de TVA, TTC = HT.
    const vatExempt = (partner as { construction_company?: boolean | null }).construction_company === true;
    const vat = vatExempt ? 0 : Math.round(totalHt * VAT_RATE * 100) / 100;
    const totalTtc = vatExempt ? totalHt : Math.round((totalHt + vat) * 100) / 100;
    const number = `B2B-${month.replace("-", "")}-APERCU`;

    const pdfBase64 = buildInvoiceB2bMonthlyPdfBase64({
      number, periodStart, periodEnd, partner, lines, totalHt, vat, totalTtc,
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

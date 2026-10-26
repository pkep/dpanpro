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
import { buildB2bInvoicePdfBase64, type B2bInvoiceLine } from "../_shared/b2b-invoice-pdf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAT_RATE = 0.20;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { partnerId, month } = await req.json();
    if (!partnerId || !month) {
      return new Response(JSON.stringify({ error: "partnerId and month required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: partner, error: pErr } = await supabase
      .from("b2b_partners")
      .select("id, company_name, siret, vat_number, address, postal_code, city, construction_company")
      .eq("id", partnerId)
      .single();
    if (pErr || !partner) throw new Error("Partenaire B2B introuvable");

    const periodStart = firstDayOfMonth(month);
    const periodEnd = lastDayOfMonth(month);
    const from = `${periodStart}T00:00:00.000Z`;
    const to = `${periodEnd}T23:59:59.999Z`;

    const { data: interventions, error: iErr } = await supabase
      .from("interventions")
      .select("id, category, final_price, estimated_price, completed_at")
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

    const lines: B2bInvoiceLine[] = interventions.map((i: any) => ({
      interventionId: i.id,
      label: `Intervention ${i.category} ${String(i.completed_at).slice(0, 10)} (${i.id})`,
      amount: Number(i.final_price ?? i.estimated_price ?? 0),
    }));
    const totalHt = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    // Autoliquidation TVA (sous-traitance BTP) : pas de TVA, TTC = HT.
    const vatExempt = (partner as { construction_company?: boolean | null }).construction_company === true;
    const vat = vatExempt ? 0 : Math.round(totalHt * VAT_RATE * 100) / 100;
    const totalTtc = vatExempt ? totalHt : Math.round((totalHt + vat) * 100) / 100;
    const number = `B2B-${month.replace("-", "")}-APERCU`;

    const pdfBase64 = buildB2bInvoicePdfBase64({
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

/**
 * generate-b2b-monthly-invoices
 *
 * Batch : génère la facture mensuelle (mois calendaire complet) de chaque partenaire B2B actif,
 * agrège les interventions terminées non facturées, génère un PDF, le stocke dans
 * `interventions/b2b/<slug>-<idCourt>/invoice-dd-mm-yyyy.pdf` et laisse la facture en `draft`
 * (envoi e-mail = manuel via `send-b2b-invoice-email`).
 *
 * body: { month?: "YYYY-MM", actorId?: string }
 *   - month absent : mois courant si on est le dernier jour du mois (Paris), sinon mois précédent.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { firstDayOfMonth, lastDayOfMonth, monthLabel, isLastDayOfMonthParis, b2bInvoicePath } from "../_shared/b2b-period.ts";
import { buildB2bInvoicePdfBase64, type B2bInvoiceLine } from "../_shared/b2b-invoice-pdf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAT_RATE = 0.20;
const BUCKET = "interventions";

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const now = new Date();
    const defaultMonth = isLastDayOfMonthParis(now)
      ? monthLabel(now)
      : monthLabel(new Date(now.getTime() - 30 * 86400000));
    const month: string = body?.month ?? defaultMonth;
    const periodStart = firstDayOfMonth(month);
    const periodEnd = lastDayOfMonth(month);
    const from = `${periodStart}T00:00:00.000Z`;
    const to = `${periodEnd}T23:59:59.999Z`;

    const { data: partners, error: pErr } = await supabase
      .from("b2b_partners")
      .select("id, company_name, siret, vat_number, address, postal_code, city, contact_firstname, contact_lastname, contact_email, construction_company")
      .eq("is_active", true);
    if (pErr) throw pErr;

    let generated = 0;
    let skipped = 0;

    for (const partner of partners ?? []) {
      // Idempotence : facture déjà existante pour ce mois ?
      const { data: existing } = await supabase
        .from("b2b_invoices")
        .select("id")
        .eq("partner_id", partner.id)
        .eq("period_start", periodStart)
        .maybeSingle();
      if (existing) { skipped++; continue; }

      const { data: interventions, error: iErr } = await supabase
        .from("interventions")
        .select("id, category, final_price, estimated_price, completed_at")
        .eq("b2b_partner_id", partner.id)
        .is("b2b_invoice_id", null)
        .eq("status", "completed")
        .gte("completed_at", from)
        .lte("completed_at", to)
        .order("completed_at", { ascending: true });
      if (iErr) throw iErr;
      if (!interventions || interventions.length === 0) { skipped++; continue; }

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
      const number = `B2B-${month.replace("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

      const { data: invoice, error: invErr } = await supabase
        .from("b2b_invoices")
        .insert({
          partner_id: partner.id,
          number,
          period_start: periodStart,
          period_end: periodEnd,
          status: "draft",
          total_ht: totalHt,
          vat_amount: vat,
          total_ttc: totalTtc,
          created_by: body?.actorId ?? null,
        })
        .select()
        .single();
      if (invErr) throw invErr;

      await supabase.from("b2b_invoices_lines").insert(
        lines.map((l) => ({ invoice_id: invoice.id, intervention_id: l.interventionId, label: l.label, amount: l.amount })),
      );
      await supabase.from("interventions")
        .update({ b2b_invoice_id: invoice.id })
        .in("id", lines.map((l) => l.interventionId));

      // PDF + stockage
      try {
        const base64 = buildB2bInvoicePdfBase64({ number, periodStart, periodEnd, partner, lines, totalHt, vat, totalTtc });
        const path = b2bInvoicePath(partner.company_name, partner.id, periodEnd);
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, base64ToUint8Array(base64), {
          contentType: "application/pdf",
          upsert: true,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        await supabase.from("b2b_invoices").update({ pdf_url: pub.publicUrl }).eq("id", invoice.id);
      } catch (e) {
        console.error(`[B2B monthly] PDF/stockage échoué pour ${partner.company_name}:`, e);
      }

      generated++;
    }

    return new Response(JSON.stringify({ success: true, month, generated, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[B2B monthly] error:", error);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

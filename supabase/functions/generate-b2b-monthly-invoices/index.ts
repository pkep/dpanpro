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
import { buildInvoiceB2bMonthlyPdfBase64 } from "../_shared/pdf/invoice-b2b-monthly.ts";
import { buildB2bMonthlyLines } from "../_shared/b2b-lines.ts";

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
      .select("id, company_name, siret, vat_number, address, postal_code, city, contact_firstname, contact_lastname, contact_email, contact_phone, construction_company")
      .eq("is_active", true);
    if (pErr) throw pErr;

    let generated = 0;
    let skipped = 0;
    const errors: Array<{ partner: string; reason: string }> = [];
    const details: Array<{
      partner: string;
      status: "generated" | "skipped" | "error";
      reason?: string;
    }> = [];

    for (const partner of partners ?? []) {
      const partnerName = partner.company_name ?? partner.id;
      try {
        // Idempotence : une facture non annulée bloque la régénération.
        const { data: existing, error: existingErr } = await supabase
          .from("b2b_invoices")
          .select("id, status")
          .eq("partner_id", partner.id)
          .eq("period_start", periodStart);
        if (existingErr) throw existingErr;
        const activeExisting = (existing ?? []).find((inv) => inv.status !== "cancelled");
        if (activeExisting) {
          skipped++;
          details.push({ partner: partnerName, status: "skipped", reason: "invoice_exists" });
          continue;
        }

        const { data: interventions, error: iErr } = await supabase
          .from("interventions")
          .select("id, category, final_price, estimated_price, completed_at, tracking_code, b2b_order_reference, address, postal_code, city, technician_id, invoice_number")
          .eq("b2b_partner_id", partner.id)
          .is("b2b_invoice_id", null)
          .eq("status", "completed")
          .gte("completed_at", from)
          .lte("completed_at", to)
          .order("completed_at", { ascending: true });
        if (iErr) throw iErr;
        if (!interventions || interventions.length === 0) {
          skipped++;
          details.push({ partner: partnerName, status: "skipped", reason: "no_invoiceable_interventions" });
          continue;
        }

        const lines = await buildB2bMonthlyLines(supabase, interventions as any[]);
        const totalHt = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
        // Facture mensuelle B2B : TVA toujours à 0, TTC = HT.
        const vat = 0;
        const totalTtc = totalHt;
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
          lines.map((l) => ({
            invoice_id: invoice.id,
            intervention_id: l.interventionId,
            label: l.label,
            amount: l.amount,
            details: {
              interventionDate: l.interventionDate,
              externalRef: l.externalRef,
              address: l.address,
              details: l.details,
              technicianName: l.technicianName,
              trackingCode: l.trackingCode,
              perServiceInvoiceNumber: l.perServiceInvoiceNumber,
            },
          })),
        );
        await supabase.from("interventions")
          .update({ b2b_invoice_id: invoice.id })
          .in("id", lines.map((l) => l.interventionId));

        // PDF + stockage (best-effort : la facture existe déjà)
        try {
          const base64 = buildInvoiceB2bMonthlyPdfBase64({ number, periodStart, periodEnd, partner, lines, totalHt, vat, totalTtc });
          const path = b2bInvoicePath(partner.company_name, partner.id, periodEnd);
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, base64ToUint8Array(base64), {
            contentType: "application/pdf",
            upsert: true,
          });
          if (upErr) throw upErr;
          const { data: pub } = await supabase.storage.from(BUCKET).getPublicUrl(path);
          await supabase.from("b2b_invoices").update({ pdf_url: pub.publicUrl }).eq("id", invoice.id);
        } catch (e) {
          console.error(`[B2B monthly] PDF/stockage échoué pour ${partnerName}:`, e);
        }

        generated++;
        details.push({ partner: partnerName, status: "generated" });
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        errors.push({ partner: partnerName, reason });
        details.push({ partner: partnerName, status: "error", reason });
        console.error(`[B2B monthly] échec pour ${partnerName}:`, e);
      }
    }

    return new Response(JSON.stringify({ success: true, month, generated, skipped, errors, details }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[B2B monthly] error:", error);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

import type { B2bInvoiceLine } from "./pdf/invoice-b2b-monthly.ts";
import { toB2bHtFromTtc } from "./b2b-vat.ts";
import { resolveInterventionDetail } from "./intervention-detail.ts";

type InterventionRow = {
  id: string;
  category?: string | null;
  description?: string | null;
  questionnaire_answers?: unknown;
  final_price?: number | null;
  estimated_price?: number | null;
  completed_at?: string | null;
  tracking_code?: string | null;
  b2b_order_reference?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  technician_id?: string | null;
  invoice_number?: string | null;
};

/** Construit les lignes détaillées de la facture mensuelle B2B. */
export async function buildB2bMonthlyLines(
  supabase: any,
  interventions: InterventionRow[],
  constructionCompany = false,
): Promise<B2bInvoiceLine[]> {
  if (interventions.length === 0) return [];
  const ids = interventions.map((i) => i.id);
  const technicianIds = Array.from(new Set(
    interventions.map((i) => i.technician_id).filter(Boolean),
  )) as string[];

  const [{ data: quotes }, { data: technicians }] = await Promise.all([
    supabase
      .from("intervention_quotes")
      .select("intervention_id, label, description, display_order")
      .in("intervention_id", ids)
      .order("display_order", { ascending: true }),
    technicianIds.length
      ? supabase.from("users").select("id, first_name, last_name").in("id", technicianIds)
      : Promise.resolve({ data: [] }),
  ]);

  const quotesByIntervention = new Map<string, string[]>();
  for (const q of quotes || []) {
    const detail = q.description ? `${q.label} — ${q.description}` : q.label;
    quotesByIntervention.set(q.intervention_id, [
      ...(quotesByIntervention.get(q.intervention_id) || []),
      detail,
    ]);
  }
  const techById = new Map<string, { first_name?: string | null; last_name?: string | null }>();
  for (const tech of technicians || []) techById.set(tech.id, tech);

  return interventions.map((i) => {
    const tech = i.technician_id ? techById.get(i.technician_id) : null;
    const technicianName = tech
      ? `${tech.last_name || ""} ${tech.first_name || ""}`.trim()
      : null;
    const cityPostal = [i.city, i.postal_code].filter(Boolean).join(" ");
    const address = [i.address, cityPostal].filter(Boolean).join(", ");
    const reference = i.tracking_code || i.id;
    return {
      interventionId: i.id,
      label: `Prestation de services en sous-traitance - Référence ${reference}`,
      amount: toB2bHtFromTtc(Number(i.final_price ?? i.estimated_price ?? 0), constructionCompany),
      interventionDate: i.completed_at ? String(i.completed_at).slice(0, 10) : null,
      externalRef: i.b2b_order_reference ?? null,
      address,
      interventionDetail: resolveInterventionDetail(i),
      details: quotesByIntervention.get(i.id) || [],
      technicianName,
      trackingCode: i.tracking_code ?? null,
      perServiceInvoiceNumber: i.invoice_number ?? null,
    };
  });
}

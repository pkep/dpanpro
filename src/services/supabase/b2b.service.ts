import { supabase } from '@/integrations/supabase/client';
import type {
  IB2bService, B2bPartner, B2bPartnerInput,
  B2bInvoice, B2bInvoiceLine, B2bInvoiceGenerateInput,
} from '@/services/interfaces/b2b.interface';

// Tables absentes des types Supabase générés tant que la migration V39 n'est pas régénérée.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const VAT_RATE = 0.20;

const mapPartner = (r: Record<string, unknown>): B2bPartner => ({
  id: String(r.id),
  companyName: (r.company_name as string) ?? '',
  siret: (r.siret as string) ?? null,
  vatNumber: (r.vat_number as string) ?? null,
  address: (r.address as string) ?? null,
  postalCode: (r.postal_code as string) ?? null,
  city: (r.city as string) ?? null,
  contactLastname: (r.contact_lastname as string) ?? null,
  contactFirstname: (r.contact_firstname as string) ?? null,
  contactPhone: (r.contact_phone as string) ?? null,
  contactEmail: (r.contact_email as string) ?? null,
  isActive: r.is_active !== false,
  createdAt: (r.created_at as string) ?? undefined,
  updatedAt: (r.updated_at as string) ?? undefined,
});

const mapLine = (r: Record<string, unknown>): B2bInvoiceLine => ({
  id: String(r.id),
  interventionId: (r.intervention_id as string) ?? null,
  label: (r.label as string) ?? null,
  amount: Number(r.amount ?? 0),
});

const mapInvoice = (r: Record<string, unknown>, lines: B2bInvoiceLine[]): B2bInvoice => ({
  id: String(r.id),
  partnerId: String(r.partner_id),
  partnerName: (r.partner_name as string) ?? null,
  number: (r.number as string) ?? null,
  periodStart: (r.period_start as string) ?? null,
  periodEnd: (r.period_end as string) ?? null,
  status: (r.status as B2bInvoice['status']) ?? 'draft',
  totalHt: Number(r.total_ht ?? 0),
  vatAmount: Number(r.vat_amount ?? 0),
  totalTtc: Number(r.total_ttc ?? 0),
  pdfUrl: (r.pdf_url as string) ?? null,
  sentAt: (r.sent_at as string) ?? null,
  paidAt: (r.paid_at as string) ?? null,
  createdAt: (r.created_at as string) ?? undefined,
  lines,
});

class SupabaseB2bService implements IB2bService {
  private partnerToRow(input: B2bPartnerInput): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    if (input.companyName !== undefined) row.company_name = input.companyName;
    if (input.siret !== undefined) row.siret = input.siret || null;
    if (input.vatNumber !== undefined) row.vat_number = input.vatNumber || null;
    if (input.address !== undefined) row.address = input.address || null;
    if (input.postalCode !== undefined) row.postal_code = input.postalCode || null;
    if (input.city !== undefined) row.city = input.city || null;
    if (input.contactLastname !== undefined) row.contact_lastname = input.contactLastname || null;
    if (input.contactFirstname !== undefined) row.contact_firstname = input.contactFirstname || null;
    if (input.contactPhone !== undefined) row.contact_phone = input.contactPhone || null;
    if (input.contactEmail !== undefined) row.contact_email = input.contactEmail || null;
    if (input.isActive !== undefined) row.is_active = input.isActive;
    return row;
  }

  async getPartners(search?: string): Promise<B2bPartner[]> {
    const { data, error } = await db.from('b2b_partners').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const q = (search || '').trim().toLowerCase();
    return ((data || []) as Record<string, unknown>[])
      .map(mapPartner)
      .filter((p) => !q
        || p.companyName.toLowerCase().includes(q)
        || (p.siret || '').includes(q)
        || (p.city || '').toLowerCase().includes(q));
  }

  async getPartner(id: string): Promise<B2bPartner> {
    const { data, error } = await db.from('b2b_partners').select('*').eq('id', id).single();
    if (error) throw error;
    return mapPartner(data);
  }

  async createPartner(input: B2bPartnerInput): Promise<B2bPartner> {
    const { data, error } = await db.from('b2b_partners').insert(this.partnerToRow(input)).select('id').single();
    if (error) throw error;
    return this.getPartner(String(data.id));
  }

  async updatePartner(id: string, input: B2bPartnerInput): Promise<B2bPartner> {
    const { error } = await db.from('b2b_partners').update(this.partnerToRow(input)).eq('id', id);
    if (error) throw error;
    return this.getPartner(id);
  }

  async deletePartner(id: string): Promise<void> {
    const { error } = await db.from('b2b_partners').delete().eq('id', id);
    if (error) throw error;
  }

  async getInvoices(partnerId?: string): Promise<B2bInvoice[]> {
    let query = db.from('b2b_invoices').select('*, b2b_partners(company_name)').order('created_at', { ascending: false });
    if (partnerId) query = query.eq('partner_id', partnerId);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []) as Record<string, unknown>[];
    const ids = rows.map((r) => r.id);
    const linesByInvoice = new Map<string, B2bInvoiceLine[]>();
    if (ids.length) {
      const { data: lines } = await db.from('b2b_invoices_lines').select('*').in('invoice_id', ids);
      for (const l of (lines || []) as Record<string, unknown>[]) {
        const key = String(l.invoice_id);
        linesByInvoice.set(key, [...(linesByInvoice.get(key) || []), mapLine(l)]);
      }
    }
    return rows.map((r) => {
      const partner = r.b2b_partners as { company_name?: string } | null;
      return mapInvoice({ ...r, partner_name: partner?.company_name ?? null }, linesByInvoice.get(String(r.id)) || []);
    });
  }

  async getInvoice(id: string): Promise<B2bInvoice> {
    const { data, error } = await db.from('b2b_invoices').select('*, b2b_partners(company_name)').eq('id', id).single();
    if (error) throw error;
    const { data: lines } = await db.from('b2b_invoices_lines').select('*').eq('invoice_id', id);
    const partner = data.b2b_partners as { company_name?: string } | null;
    return mapInvoice({ ...data, partner_name: partner?.company_name ?? null }, ((lines || []) as Record<string, unknown>[]).map(mapLine));
  }

  async generateInvoice(input: B2bInvoiceGenerateInput): Promise<B2bInvoice> {
    const from = `${input.periodStart}T00:00:00.000Z`;
    const to = `${input.periodEnd}T23:59:59.999Z`;
    const { data: interventions, error } = await db
      .from('interventions')
      .select('id, category, final_price, estimated_price, completed_at')
      .eq('billing_type', 'b2b')
      .eq('status', 'completed')
      .is('b2b_invoice_id', null)
      .eq('b2b_partner_id', input.partnerId)
      .gte('completed_at', from)
      .lte('completed_at', to)
      .order('completed_at');
    if (error) throw error;
    const rows = (interventions || []) as Record<string, unknown>[];
    if (!rows.length) throw new Error("Aucune intervention B2B terminée à facturer sur cette période");

    const yyyymm = input.periodEnd.slice(0, 7).replace('-', '');
    const number = `B2B-${yyyymm}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
    const totalHt = rows.reduce((sum, r) => sum + Number(r.final_price ?? r.estimated_price ?? 0), 0);
    const vatAmount = Math.round(totalHt * VAT_RATE * 100) / 100;
    const totalTtc = Math.round((totalHt + vatAmount) * 100) / 100;

    const { data: invoice, error: invError } = await db.from('b2b_invoices').insert({
      partner_id: input.partnerId,
      number,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      status: 'draft',
      total_ht: totalHt,
      vat_amount: vatAmount,
      total_ttc: totalTtc,
    }).select('id').single();
    if (invError) throw invError;
    const invoiceId = String(invoice.id);

    const lines = rows.map((r) => ({
      invoice_id: invoiceId,
      intervention_id: r.id,
      label: `Intervention ${r.category ?? ''} ${(r.completed_at as string)?.slice(0, 10) ?? ''}`.trim(),
      amount: Number(r.final_price ?? r.estimated_price ?? 0),
    }));
    const { error: lineError } = await db.from('b2b_invoices_lines').insert(lines);
    if (lineError) throw lineError;

    await db.from('interventions').update({ b2b_invoice_id: invoiceId }).in('id', rows.map((r) => r.id));

    return this.getInvoice(invoiceId);
  }

  private async setStatus(id: string, status: B2bInvoice['status'], extra: Record<string, unknown> = {}): Promise<B2bInvoice> {
    const { error } = await db.from('b2b_invoices').update({ status, ...extra }).eq('id', id);
    if (error) throw error;
    return this.getInvoice(id);
  }

  markInvoiceSent(id: string): Promise<B2bInvoice> {
    return this.setStatus(id, 'sent', { sent_at: new Date().toISOString() });
  }

  markInvoicePaid(id: string): Promise<B2bInvoice> {
    return this.setStatus(id, 'paid', { paid_at: new Date().toISOString() });
  }

  async cancelInvoice(id: string): Promise<B2bInvoice> {
    // Libère les interventions rattachées (redeviennent « à facturer »)
    const { data: lines } = await db.from('b2b_invoices_lines').select('intervention_id').eq('invoice_id', id);
    const ids = ((lines || []) as Record<string, unknown>[]).map((l) => l.intervention_id).filter(Boolean);
    if (ids.length) await db.from('interventions').update({ b2b_invoice_id: null }).in('id', ids);
    return this.setStatus(id, 'cancelled');
  }
}

export const b2bService = new SupabaseB2bService();

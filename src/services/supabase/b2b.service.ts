import { supabase } from '@/integrations/supabase/client';
import type {
  IB2bService, B2bPartner, B2bPartnerInput,
  B2bInvoice, B2bInvoiceLine, B2bPortalIntervention, B2bPortalFilters,
  B2bInterventionInput, B2bAccessCredentials,
} from '@/services/interfaces/b2b.interface';
import { geocodingService } from '@/services/components/geocoding/geocoding.service';
import { recordInterventionStatusChange } from '@/services/supabase/intervention-history-status.service';

// Tables absentes des types Supabase générés tant que la migration V39 n'est pas régénérée.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

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
  userId: (r.user_id as string) ?? null,
  isActive: r.is_active !== false,
  constructionCompany: r.construction_company === true,
  createdAt: (r.created_at as string) ?? undefined,
  updatedAt: (r.updated_at as string) ?? undefined,
});

const mapLine = (r: Record<string, unknown>): B2bInvoiceLine => ({
  id: String(r.id),
  interventionId: (r.intervention_id as string) ?? null,
  label: (r.label as string) ?? null,
  amount: Number(r.amount ?? 0),
  details: (r.details as B2bInvoiceLine['details']) ?? undefined,
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
    if (input.constructionCompany !== undefined) row.construction_company = input.constructionCompany;
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

  async getInvoices(partnerId?: string, month?: string): Promise<B2bInvoice[]> {
    let query = db.from('b2b_invoices').select('*, b2b_partners(company_name)').order('created_at', { ascending: false });
    if (partnerId) query = query.eq('partner_id', partnerId);
    if (month) query = query.eq('period_start', `${month}-01`);
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

  async previewInvoicePdf(partnerId: string, month: string): Promise<{ pdfBase64: string; filename: string }> {
    const { data, error } = await supabase.functions.invoke('generate-b2b-invoice-pdf', {
      body: { partnerId, month },
    });
    if (error) throw error;
    if (data && data.error) throw new Error(data.error);
    return { pdfBase64: data.pdfBase64, filename: data.filename };
  }

  async sendInvoice(id: string): Promise<B2bInvoice> {
    const { data, error } = await supabase.functions.invoke('send-b2b-invoice-email', {
      body: { invoiceId: id },
    });
    if (error) throw error;
    if (data && data.error) throw new Error(data.error);
    return this.getInvoice(id);
  }

  async sendInvoices(month: string): Promise<{ sent: number }> {
    const invoices = await this.getInvoices(undefined, month);
    const drafts = invoices.filter((i) => i.status === 'draft');
    let sent = 0;
    for (const inv of drafts) {
      try {
        await this.sendInvoice(inv.id);
        sent++;
      } catch (e) {
        console.error('sendInvoice failed', inv.id, e);
      }
    }
    return { sent };
  }

  private async setStatus(id: string, status: B2bInvoice['status'], extra: Record<string, unknown> = {}): Promise<B2bInvoice> {
    const { error } = await db.from('b2b_invoices').update({ status, ...extra }).eq('id', id);
    if (error) throw error;
    return this.getInvoice(id);
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

  // ── Portail partenaire ─────────────────────────────────────────────────────

  async getMyPartner(userId: string): Promise<B2bPartner | null> {
    const { data, error } = await db
      .from('b2b_partners')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapPartner(data) : null;
  }

  async getMyInterventions(userId: string, filters?: B2bPortalFilters): Promise<B2bPortalIntervention[]> {
    const partner = await this.getMyPartner(userId);
    if (!partner) return [];

    let query = db
      .from('interventions')
      .select('*')
      .eq('b2b_partner_id', partner.id)
      .order('created_at', { ascending: false });
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.from) query = query.gte('created_at', filters.from);
    if (filters?.to) query = query.lte('created_at', filters.to);

    const { data, error } = await query;
    if (error) throw error;

    const invoices = await this.getMyInvoices(userId);
    const invoicesById = new Map(invoices.map((i) => [i.id, i]));
    const q = (filters?.search || '').trim().toLowerCase();

    return ((data || []) as Record<string, unknown>[])
      .map((row) => {
        const invoice = row.b2b_invoice_id ? invoicesById.get(String(row.b2b_invoice_id)) : null;
        return {
          id: String(row.id),
          createdAt: String(row.created_at),
          completedAt: (row.completed_at as string) ?? null,
          trackingCode: (row.tracking_code as string) ?? null,
          category: String(row.category ?? ''),
          status: String(row.status ?? ''),
          title: String(row.title ?? ''),
          description: (row.description as string) ?? null,
          address: String(row.address ?? ''),
          city: String(row.city ?? ''),
          postalCode: String(row.postal_code ?? ''),
          estimatedPrice: (row.estimated_price as number) ?? null,
          finalPrice: (row.final_price as number) ?? null,
          quotePdfUrl: (row.quote_pdf_url as string) ?? null,
          invoicePdfUrl: (row.invoice_pdf_url as string) ?? null,
          b2bInvoiceId: (row.b2b_invoice_id as string) ?? null,
          b2bInvoiceNumber: invoice?.number ?? null,
          b2bInvoicePdfUrl: invoice?.pdfUrl ?? null,
          clientFirstName: (row.client_first_name as string) ?? null,
          clientLastName: (row.client_last_name as string) ?? null,
          b2bOrderReference: (row.b2b_order_reference as string) ?? null,
        } satisfies B2bPortalIntervention;
      })
      .filter((i) => !q
        || i.title.toLowerCase().includes(q)
        || (i.trackingCode || '').toLowerCase().includes(q)
        || i.address.toLowerCase().includes(q)
        || i.city.toLowerCase().includes(q));
  }

  async getMyInvoices(userId: string): Promise<B2bInvoice[]> {
    const partner = await this.getMyPartner(userId);
    if (!partner) return [];
    return this.getInvoices(partner.id);
  }

  async createMyIntervention(userId: string, input: B2bInterventionInput): Promise<B2bPortalIntervention> {
    const partner = await this.getMyPartner(userId);
    if (!partner) throw new Error('Aucun partenaire B2B lié à ce compte');

    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
      const geo = await geocodingService.geocodeAddress(input.address, input.city, input.postalCode);
      latitude = geo?.latitude ?? null;
      longitude = geo?.longitude ?? null;
    } catch (e) {
      console.warn('Geocoding failed for B2B intervention:', e);
    }

    const title = `${input.category} - ${input.address} - ${input.postalCode}`;
    const { data, error } = await db.from('interventions').insert({
      client_id: null,
      category: input.category,
      title,
      description: input.description || null,
      address: input.address,
      city: input.city,
      postal_code: input.postalCode,
      latitude,
      longitude,
      priority: input.priority || 'normal',
      status: 'new',
      is_active: true,
      client_email: input.clientEmail || null,
      client_phone: input.clientPhone,
      client_first_name: input.clientFirstName,
      client_last_name: input.clientLastName,
      billing_type: 'b2b',
      b2b_partner_id: partner.id,
      b2b_order_reference: input.b2bOrderReference || null,
      photos: input.photos && input.photos.length > 0 ? input.photos : null,
      scheduled_at: input.scheduledAt || null,
      questionnaire_answers: input.questionnaireAnswers && input.questionnaireAnswers.length > 0
        ? input.questionnaireAnswers : null,
      prix_min: input.prixMin ?? null,
      prix_max: input.prixMax ?? null,
    }).select('*').single();
    if (error) throw error;

    const row = data as Record<string, unknown>;
    recordInterventionStatusChange(String(row.id), 'new');
    supabase.functions
      .invoke('dispatch-intervention', { body: { interventionId: row.id } })
      .catch((e) => console.error('B2B auto-dispatch failed:', e));

    return {
      id: String(row.id),
      createdAt: String(row.created_at),
      completedAt: (row.completed_at as string) ?? null,
      trackingCode: (row.tracking_code as string) ?? null,
      category: String(row.category ?? ''),
      status: String(row.status ?? 'new'),
      title: String(row.title ?? ''),
      description: (row.description as string) ?? null,
      address: String(row.address ?? ''),
      city: String(row.city ?? ''),
      postalCode: String(row.postal_code ?? ''),
      estimatedPrice: (row.estimated_price as number) ?? null,
      finalPrice: (row.final_price as number) ?? null,
      quotePdfUrl: (row.quote_pdf_url as string) ?? null,
      invoicePdfUrl: (row.invoice_pdf_url as string) ?? null,
      b2bInvoiceId: null,
      b2bInvoiceNumber: null,
      b2bInvoicePdfUrl: null,
      clientFirstName: input.clientFirstName,
      clientLastName: input.clientLastName,
      b2bOrderReference: input.b2bOrderReference ?? null,
    };
  }

  async createAccess(partner: B2bPartner, createdBy?: string): Promise<B2bAccessCredentials> {
    const { data, error } = await supabase.functions.invoke('create-b2b-user', {
      body: {
        b2bPartnerId: partner.id,
        email: partner.contactEmail,
        firstName: partner.contactFirstname,
        lastName: partner.contactLastname,
        phone: partner.contactPhone,
        createdBy,
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return {
      userId: data.userId,
      email: data.email,
      tempPassword: data.tempPassword,
    };
  }
}

export const b2bService = new SupabaseB2bService();

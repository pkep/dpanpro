/**
 * Espace B2B — partenaires entreprise (payeurs) et facturation mensuelle
 * groupée des interventions réalisées pour leurs clients.
 *
 * L'adresse d'intervention est portée par l'intervention elle-même (formulaire),
 * pas par une table de sites.
 */

export interface B2bPartner {
  id: string;
  companyName: string;
  siret: string | null;
  vatNumber: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  contactLastname: string | null;
  contactFirstname: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface B2bPartnerInput {
  companyName: string;
  siret?: string;
  vatNumber?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  contactLastname?: string;
  contactFirstname?: string;
  contactPhone?: string;
  contactEmail?: string;
  isActive?: boolean;
}

export type B2bInvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export interface B2bInvoiceLine {
  id: string;
  interventionId: string | null;
  label: string | null;
  amount: number;
}

export interface B2bInvoice {
  id: string;
  partnerId: string;
  partnerName: string | null;
  number: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  status: B2bInvoiceStatus;
  totalHt: number;
  vatAmount: number;
  totalTtc: number;
  pdfUrl: string | null;
  sentAt?: string | null;
  paidAt?: string | null;
  createdAt?: string;
  lines: B2bInvoiceLine[];
}

export interface IB2bService {
  // Partenaires
  getPartners(search?: string): Promise<B2bPartner[]>;
  getPartner(id: string): Promise<B2bPartner>;
  createPartner(input: B2bPartnerInput): Promise<B2bPartner>;
  updatePartner(id: string, input: B2bPartnerInput): Promise<B2bPartner>;
  deletePartner(id: string): Promise<void>;

  // Factures mensuelles
  getInvoices(partnerId?: string, month?: string): Promise<B2bInvoice[]>;
  getInvoice(id: string): Promise<B2bInvoice>;
  /** Aperçu transitoire (aucune persistance) du PDF de la facture du mois pour un partenaire. */
  previewInvoicePdf(partnerId: string, month: string): Promise<{ pdfBase64: string; filename: string }>;
  sendInvoice(id: string): Promise<B2bInvoice>;
  sendInvoices(month: string): Promise<{ sent: number }>;
  markInvoicePaid(id: string): Promise<B2bInvoice>;
  cancelInvoice(id: string): Promise<B2bInvoice>;
}

/**
 * Espace B2B — partenaires entreprise (payeurs) et facturation mensuelle
 * groupée des interventions réalisées pour leurs clients.
 *
 * L'adresse d'intervention est portée par l'intervention elle-même (formulaire),
 * pas par une table de sites.
 */

import type { InterventionCategory, InterventionPriority } from '@/types/intervention.types';

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
  /** Compte de connexion B2B rattaché (null tant que l'accès n'est pas créé). */
  userId?: string | null;
  isActive: boolean;
  /** Entreprise de construction (BTP) : facturation en autoliquidation de TVA. */
  constructionCompany: boolean;
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
  /** Entreprise de construction (BTP) : facturation en autoliquidation de TVA. */
  constructionCompany?: boolean;
}

export type B2bInvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export interface B2bInvoiceLineDetails {
  interventionDate?: string | null;
  externalRef?: string | null;
  address?: string | null;
  details?: string[];
  technicianName?: string | null;
  trackingCode?: string | null;
  perServiceInvoiceNumber?: string | null;
}

export interface B2bInvoiceLine {
  id: string;
  interventionId: string | null;
  label: string | null;
  amount: number;
  details?: B2bInvoiceLineDetails;
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

/** Intervention telle que vue par le portail partenaire (uniquement les siennes). */
export interface B2bPortalIntervention {
  id: string;
  createdAt: string;
  completedAt: string | null;
  trackingCode: string | null;
  category: string;
  status: string;
  title: string;
  description: string | null;
  address: string;
  city: string;
  postalCode: string;
  estimatedPrice: number | null;
  finalPrice: number | null;
  quotePdfUrl: string | null;
  /** Facture par intervention (générée à la finalisation). */
  invoicePdfUrl: string | null;
  b2bInvoiceId: string | null;
  b2bInvoiceNumber: string | null;
  b2bInvoicePdfUrl: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
  b2bOrderReference: string | null;
}

export interface B2bPortalFilters {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface B2bInterventionInput {
  category: InterventionCategory;
  description?: string;
  address: string;
  city: string;
  postalCode: string;
  priority?: InterventionPriority;
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  clientEmail?: string;
  b2bOrderReference?: string;
  photos?: string[];
  scheduledAt?: string | null;
  questionnaireAnswers?: string[];
  prixMin?: number | null;
  prixMax?: number | null;
}

export interface B2bAccessCredentials {
  userId: string;
  email: string;
  tempPassword: string;
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

  // Portail partenaire (compte connecté)
  getMyPartner(userId: string): Promise<B2bPartner | null>;
  getMyInterventions(userId: string, filters?: B2bPortalFilters): Promise<B2bPortalIntervention[]>;
  getMyInvoices(userId: string): Promise<B2bInvoice[]>;
  createMyIntervention(userId: string, input: B2bInterventionInput): Promise<B2bPortalIntervention>;
  /** Admin : crée le compte de connexion du partenaire (email = contact_email). */
  createAccess(partner: B2bPartner, createdBy?: string): Promise<B2bAccessCredentials>;
}

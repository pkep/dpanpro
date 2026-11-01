/**
 * Helpers d'affichage du tableau admin des interventions
 * (page « Gestion des Interventions »).
 */

import type {
  InterventionAdminView,
  InterventionCategory,
  InterventionPriority,
  InterventionStatus,
} from '@/types/intervention.types';

export type UrgencyLevel = 'standard' | 'high' | 'urgent' | 'scheduled';

export const URGENCY_LEVEL_META: Record<UrgencyLevel, { label: string; className: string }> = {
  standard:  { label: 'Standard',    className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  high:      { label: 'Prioritaire', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  urgent:    { label: 'Urgence',     className: 'bg-rose-100 text-rose-800 border-rose-200' },
  scheduled: { label: 'Planifié',    className: 'bg-blue-100 text-blue-800 border-blue-200' },
};

export interface InterventionDetailSource {
  questionnaireAnswers?: string | string[] | null;
  description?: string | null;
  priority?: string | null;
  scheduledAt?: string | null;
}

/**
 * Niveau d'urgence affiché dans la colonne « Urgence » :
 * une intervention planifiée (`scheduledAt`) est « Planifié », sinon on
 * déduit de la priorité : `urgent` → Urgence, `high` → Prioritaire, sinon Standard.
 */
export function getUrgencyLevel(intervention: InterventionDetailSource): UrgencyLevel {
  if (intervention.scheduledAt) return 'scheduled';
  if (intervention.priority === 'urgent') return 'urgent';
  if (intervention.priority === 'high') return 'high';
  return 'standard';
}

/**
 * Contenu de la colonne « Détail » : les réponses au questionnaire si présentes,
 * sinon la description (le client y explique souvent son problème quand la
 * prestation n'a pas été trouvée), sinon « - ».
 */
export function getInterventionDetail(intervention: InterventionDetailSource): string {
  const answers = intervention.questionnaireAnswers;
  const answersText = Array.isArray(answers) ? answers.join(', ') : (answers ?? '');
  return answersText.trim() || (intervention.description ?? '').trim() || '-';
}

export type AmountKind = 'range' | 'estimated' | 'final' | 'none';

export interface AmountInfo {
  kind: AmountKind;
  /** Montant formaté (suffixe TTC) ou '—'. */
  value: string;
  /** Nature du montant affiché. */
  label: string;
}

export const AMOUNT_KIND_META: Record<Exclude<AmountKind, 'none'>, { label: string; className: string }> = {
  range:     { label: 'Fourchette', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  estimated: { label: 'Estimé',     className: 'bg-amber-100 text-amber-800 border-amber-200' },
  final:     { label: 'Final',      className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

export interface AmountSource {
  finalPrice?: number | null;
  estimatedPrice?: number | null;
  prixMin?: number | null;
  prixMax?: number | null;
}

/**
 * Colonne « Montant » : montant du **stade courant** du cycle de vie, avec sa
 * nature — précédence Final > Estimé > Fourchette.
 * `finalPrice` / `estimatedPrice` valant 0 sont traités comme absents
 * (aucune intervention n'est gratuite).
 */
export function getAmountInfo(i: AmountSource): AmountInfo {
  const euro = (n: number) => `${n.toFixed(2)} € TTC`;
  if (i.finalPrice) {
    return { kind: 'final', value: euro(i.finalPrice), label: AMOUNT_KIND_META.final.label };
  }
  if (i.estimatedPrice) {
    return { kind: 'estimated', value: euro(i.estimatedPrice), label: AMOUNT_KIND_META.estimated.label };
  }
  if (i.prixMin && i.prixMax) {
    return {
      kind: 'range',
      value: `${i.prixMin.toFixed(2)} – ${i.prixMax.toFixed(2)} € TTC`,
      label: AMOUNT_KIND_META.range.label,
    };
  }
  return { kind: 'none', value: '—', label: '' };
}

// ── Colonne « Paiement » ────────────────────────────────────────────────────

export type PaymentDisplayStatus =
  | 'paid'
  | 'authorized'
  | 'pending'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'
  | 'unpaid'
  | 'to_pay'
  | 'draft'
  | 'unbilled';

export interface PaymentStatusMeta {
  label: string;
  className: string;
  /** Détail affiché dans le tooltip. */
  description: string;
}

export const PAYMENT_STATUS_META: Record<PaymentDisplayStatus, PaymentStatusMeta> = {
  paid:               { label: 'Payé',              className: 'bg-emerald-100 text-emerald-800 border-emerald-200', description: 'Paiement encaissé' },
  authorized:         { label: 'Autorisé',          className: 'bg-blue-100 text-blue-800 border-blue-200',          description: 'Paiement autorisé, non capturé' },
  pending:            { label: 'En attente',        className: 'bg-amber-100 text-amber-800 border-amber-200',        description: 'Paiement en attente' },
  failed:             { label: 'Échec',             className: 'bg-rose-100 text-rose-800 border-rose-200',           description: 'Paiement échoué' },
  cancelled:          { label: 'Annulé',            className: 'bg-slate-100 text-slate-700 border-slate-200',         description: 'Paiement annulé' },
  refunded:           { label: 'Remboursé',         className: 'bg-violet-100 text-violet-800 border-violet-200',     description: 'Paiement remboursé' },
  partially_refunded: { label: 'Remboursé partiel', className: 'bg-violet-100 text-violet-800 border-violet-200',     description: 'Paiement partiellement remboursé' },
  unpaid:             { label: 'Non payé',          className: 'bg-slate-100 text-slate-700 border-slate-200',        description: 'Aucun paiement enregistré' },
  to_pay:             { label: 'À payer',           className: 'bg-amber-100 text-amber-800 border-amber-200',        description: 'Facture envoyée, en attente de paiement' },
  draft:              { label: 'Brouillon',         className: 'bg-slate-100 text-slate-700 border-slate-200',        description: 'Facture en brouillon' },
  unbilled:           { label: 'Non facturé',       className: 'bg-slate-100 text-slate-700 border-slate-200',        description: 'Aucune facture mensuelle rattachée' },
};

/** Statuts `payment_authorizations` (B2C) → statut d'affichage. */
const B2C_PAYMENT_STATUS: Record<string, PaymentDisplayStatus> = {
  captured: 'paid',
  authorized: 'authorized',
  pending: 'pending',
  failed: 'failed',
  cancelled: 'cancelled',
  refunded: 'refunded',
  partially_refunded: 'partially_refunded',
};

/** Statuts `b2b_invoices` (B2B) → statut d'affichage. */
const B2B_PAYMENT_STATUS: Record<string, PaymentDisplayStatus> = {
  paid: 'paid',
  sent: 'to_pay',
  draft: 'draft',
  cancelled: 'cancelled',
};

export interface PaymentStatusSource {
  /** Intervention B2B → le paiement dépend de la facture mensuelle. */
  b2b: boolean;
  /** Dernière autorisation de paiement B2C (la plus récente par `createdAt`). */
  authorizationStatus?: string | null;
  /** Statut de la facture mensuelle liée (`interventions.b2b_invoice_id`). */
  invoiceStatus?: string | null;
}

/**
 * Statut de paiement **réel** d'une intervention :
 * - B2C : dernière `payment_authorizations` ;
 * - B2B : facture mensuelle liée (`b2b_invoices.status`).
 */
export function getPaymentStatus(source: PaymentStatusSource): PaymentDisplayStatus {
  if (source.b2b) {
    if (!source.invoiceStatus) return 'unbilled';
    return B2B_PAYMENT_STATUS[source.invoiceStatus] ?? 'draft';
  }
  if (!source.authorizationStatus) return 'unpaid';
  return B2C_PAYMENT_STATUS[source.authorizationStatus] ?? 'unpaid';
}

export interface PaymentStatusInfo extends PaymentStatusMeta {
  status: PaymentDisplayStatus;
}

const DEFAULT_PAYMENT_INFO: PaymentStatusMeta = {
  label: '',
  className: 'bg-slate-100 text-slate-700 border-slate-200',
  description: '',
};

export function getPaymentStatusInfo(source: PaymentStatusSource): PaymentStatusInfo {
  const status = getPaymentStatus(source);
  const meta = PAYMENT_STATUS_META[status] ?? DEFAULT_PAYMENT_INFO;
  return { status, ...meta };
}

export interface InterventionTypeSource {
  b2bPartnerId?: string | null;
}

/** Intervention B2B = créée pour un partenaire (`b2b_partner_id` renseigné). */
export function isB2bIntervention(intervention: InterventionTypeSource): boolean {
  return !!intervention.b2bPartnerId;
}

export interface ClientPhotosSource {
  clientPhotosCount?: number | null;
}

/**
 * Vrai si l'intervention a au moins une photo client.
 * Basé sur le compteur `client_photos_count` : la liste admin ne transporte
 * plus le tableau `photos` (chargé à la demande dans la lightbox).
 */
export function hasClientPhotos(intervention: ClientPhotosSource): boolean {
  return (intervention.clientPhotosCount ?? 0) > 0;
}

/**
 * Formate une identité « NOM Prénom » (nom en MAJ, prénom capitalisé) + téléphone,
 * comme la colonne « Client » des interventions normales.
 */
export function formatClientIdentity(
  lastName?: string | null,
  firstName?: string | null,
  phone?: string | null,
): { name: string; phone: string | null } {
  const clean = (s: string) => (s || '').trim().replace(/\s+/g, ' ');
  const capFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');
  const last = clean(lastName || '').toUpperCase();
  const first = capFirst(clean(firstName || ''));
  const name = `${last} ${first}`.trim();
  return { name: name || '—', phone: (phone || '').trim() || null };
}

/**
 * Ligne brute de la vue admin (colonnes sélectionnées par `ADMIN_LIST`).
 * Note : `photos` n'est volontairement pas transporté — on ne reçoit que
 * `client_photos_count` (P0).
 */
export interface AdminInterventionRow {
  id: string;
  title: string;
  category: string;
  address: string;
  city: string;
  postal_code: string;
  latitude?: number | null;
  longitude?: number | null;
  client_id: string;
  tracking_code: string;
  technician_id: string | null;
  status: string;
  suspended?: boolean | null;
  priority?: string | null;
  scheduled_at?: string | null;
  description?: string | null;
  created_at: string;
  final_price: number | null;
  estimated_price: number | null;
  prix_min: number | null;
  prix_max: number | null;
  questionnaire_answers: string | string[] | null;
  client_photos_count?: number | null;
  b2b_partner_id?: string | null;
  b2b_invoice_id?: string | null;
  client_first_name?: string | null;
  client_last_name?: string | null;
  client_phone?: string | null;
  b2b_partners?: {
    company_name?: string | null;
    contact_firstname?: string | null;
    contact_lastname?: string | null;
    contact_phone?: string | null;
  } | null;
}

/** Mappe une ligne brute `interventions` vers la vue admin. */
export function mapAdminInterventionRow(row: AdminInterventionRow): InterventionAdminView {
  const b2b = row.b2b_partners ?? null;
  return {
    id: row.id,
    title: row.title,
    category: row.category as InterventionCategory,
    address: row.address,
    city: row.city,
    postalCode: row.postal_code,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    clientId: row.client_id,
    trackingCode: row.tracking_code,
    technicianId: row.technician_id,
    status: row.status as InterventionStatus,
    suspended: row.suspended ?? false,
    priority: (row.priority ?? undefined) as InterventionPriority | undefined,
    scheduledAt: row.scheduled_at ?? null,
    description: row.description ?? null,
    createdAt: row.created_at,
    finalPrice: row.final_price,
    estimatedPrice: row.estimated_price,
    prixMin: row.prix_min,
    prixMax: row.prix_max,
    questionnaireAnswers: row.questionnaire_answers,
    photos: null,
    clientPhotosCount: row.client_photos_count ?? 0,
    b2bPartnerId: row.b2b_partner_id ?? null,
    b2bInvoiceId: row.b2b_invoice_id ?? null,
    b2bCompanyName: b2b?.company_name ?? null,
    b2bContactFirstName: b2b?.contact_firstname ?? null,
    b2bContactLastName: b2b?.contact_lastname ?? null,
    b2bContactPhone: b2b?.contact_phone ?? null,
    clientFirstName: row.client_first_name ?? null,
    clientLastName: row.client_last_name ?? null,
    clientPhone: row.client_phone ?? null,
  };
}


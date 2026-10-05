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
    b2bCompanyName: b2b?.company_name ?? null,
    b2bContactFirstName: b2b?.contact_firstname ?? null,
    b2bContactLastName: b2b?.contact_lastname ?? null,
    b2bContactPhone: b2b?.contact_phone ?? null,
    clientFirstName: row.client_first_name ?? null,
    clientLastName: row.client_last_name ?? null,
    clientPhone: row.client_phone ?? null,
  };
}


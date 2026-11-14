import type { InterventionFormData, InterventionQuestionnaireData } from '@/types/intervention.types';

/**
 * Construction de la ligne `interventions` à insérer (mode Supabase).
 *
 * Règles :
 * - `client_first_name` / `client_last_name` sont **toujours** persistés quand ils sont
 *   fournis (invité, client avec compte, B2B) : `trim()`, `null` si vide.
 * - B2B : `billing_type = 'b2b'`, pas de `client_id`, partenaire + référence + plafond.
 * - La priorité d'affichage du nom (compte → contact B2B → contact intervention) reste
 *   gérée par `lib/clientName.ts`.
 */

export interface InterventionGeo {
  latitude: number | null;
  longitude: number | null;
}

export function normalizeName(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed : null;
}

export function isB2bFormData(formData: Pick<InterventionFormData, 'billingType' | 'b2bPartnerId'>): boolean {
  return formData.billingType === 'b2b' || !!formData.b2bPartnerId;
}

export function buildInterventionInsertData(
  clientId: string | null,
  formData: InterventionFormData,
  questionnaireData: InterventionQuestionnaireData | undefined,
  geo: InterventionGeo,
  title: string,
): Record<string, unknown> {
  const isB2b = isB2bFormData(formData);

  const insertData: Record<string, unknown> = {
    client_id: isB2b ? null : clientId,
    category: formData.category,
    title,
    description: formData.description,
    address: formData.address,
    city: formData.city,
    postal_code: formData.postalCode,
    latitude: geo.latitude,
    longitude: geo.longitude,
    priority: formData.priority || 'normal',
    status: 'new',
    is_active: true,
    client_email: formData.clientEmail || null,
    client_phone: formData.clientPhone || null,
    // Contact saisi sur l'intervention — snapshot conservé pour tous les types.
    client_first_name: normalizeName(formData.clientFirstName),
    client_last_name: normalizeName(formData.clientLastName),
    photos: formData.photos || null,
    scheduled_at: formData.scheduledAt || null,
  };

  const campaignCode = formData.campaignCode || questionnaireData?.campaignCode;
  if (campaignCode) {
    insertData.campaign_code = campaignCode.trim().toUpperCase();
  }

  // B2B : intervention pour un partenaire — pas de client User, bénéficiaire sur site
  if (isB2b) {
    insertData.billing_type = 'b2b';
    insertData.b2b_partner_id = formData.b2bPartnerId || null;
    insertData.b2b_order_reference = formData.b2bOrderReference || null;
    if (formData.b2bPriceCap != null) insertData.b2b_price_cap = formData.b2bPriceCap;
  }

  if (questionnaireData) {
    if (questionnaireData.questionnaireAnswers) {
      insertData.questionnaire_answers = questionnaireData.questionnaireAnswers;
    }
    if (questionnaireData.prixMin !== undefined) {
      insertData.prix_min = questionnaireData.prixMin;
    }
    if (questionnaireData.prixMax !== undefined) {
      insertData.prix_max = questionnaireData.prixMax;
    }
  }

  return insertData;
}

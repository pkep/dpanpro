import type { InterventionStatus } from '@/types/intervention.types';

/** Statuts terminaux d'une escalade. */
export const ESCALATION_TERMINAL_STATUSES: InterventionStatus[] = [
  'complete_climbed',
  'complete_climbed_external',
  'cancelled_escalation_declined',
];

export type EscalationType = 'internal' | 'external';

/**
 * Forme tolérante : accepte à la fois camelCase (gateway) et snake_case (Supabase).
 */
export interface EscalationBannerInput {
  escalationType?: string | null;
  parentInterventionId?: string | null;
  escalation_type?: string | null;
  parent_id_intervention?: string | null;
}

export interface EscalationBanner {
  type: EscalationType;
  title: string;
  message: string;
}

/**
 * Retourne le bandeau d'escalade à afficher au client, ou null.
 *
 * Règle : uniquement pour l'intervention **parente** (pas de `parentInterventionId`)
 * et lorsqu'un type d'escalade est renseigné. L'intervention enfant ne l'affiche jamais.
 */
export function getEscalationBanner(input: EscalationBannerInput): EscalationBanner | null {
  const type = (input.escalationType ?? input.escalation_type ?? null) as EscalationType | null;
  const parentId = input.parentInterventionId ?? input.parent_id_intervention ?? null;

  if (!type || parentId) return null;

  if (type === 'external') {
    return {
      type: 'external',
      title: 'Intervention confiée à un prestataire externe',
      message:
        "Votre intervention a été confiée à un prestataire externe à notre plateforme. Ce prestataire vous contactera prochainement. Notre support suit votre dossier.",
    };
  }

  return {
    type: 'internal',
    title: 'Intervention transférée',
    message:
      "Votre intervention a été transférée à un autre technicien Dépann.Pro. Vous serez notifié dès qu'un technicien est assigné.",
  };
}

export const COLD_ESCALATION_STATUSES: InterventionStatus[] = [
  'assigned',
  'on_route',
  'arrived',
  'in_progress',
  'completed',
];

const COLD_ESCALATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Éligibilité UI : statut autorisé + création il y a 7 jours maximum. */
export function isColdEscalationEligible(
  intervention: { status: InterventionStatus; createdAt: string },
  now: Date = new Date(),
): boolean {
  if (!COLD_ESCALATION_STATUSES.includes(intervention.status)) return false;
  const created = new Date(intervention.createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return now.getTime() - created <= COLD_ESCALATION_WINDOW_MS;
}

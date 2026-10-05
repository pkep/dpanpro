import type { Intervention, InterventionStatus } from '@/types/intervention.types';

/** Horizon (heures) avant une intervention planifiée pour basculer en focus. Miroir du gateway. */
export const FOCUS_HORIZON_HOURS = 2;

/** Statuts qui rendent le technicien « occupé » (focus). Exclut `scheduled_assigned`. */
export const TECHNICIAN_BUSY_STATUSES: InterventionStatus[] = [
  'assigned',
  'on_route',
  'arrived',
  'in_progress',
];

export function isBusyStatus(status: InterventionStatus): boolean {
  return TECHNICIAN_BUSY_STATUSES.includes(status);
}

/**
 * Le technicien est-il « focus » (ne doit plus recevoir de message de dispatch) ?
 * Vrai s'il a une intervention busy (non suspendue), ou une planifiée (`scheduled_assigned`)
 * imminente (≤ horizon). Une intervention suspendue (`suspended = true`) ne bloque PAS le technicien.
 */
export function isTechnicianFocused(interventions: Intervention[], now: Date = new Date()): boolean {
  const horizon = now.getTime() + FOCUS_HORIZON_HOURS * 3600 * 1000;
  return interventions.some((i) => {
    if (i.suspended) return false;
    if (isBusyStatus(i.status)) return true;
    if (i.status === 'scheduled_assigned' && i.scheduledAt) {
      return new Date(i.scheduledAt).getTime() <= horizon;
    }
    return false;
  });
}

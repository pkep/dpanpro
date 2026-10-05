import type { InterventionStatus } from '@/types/intervention.types';

/**
 * Machine à états côté front — miroir de
 * `gateway/.../util/InterventionStatusTransitions.java` (R1).
 *
 * L'éditeur admin/manager est volontairement limité aux statuts **opérationnels** :
 * `completed` / `cancelled` et les statuts d'escalade restent gérés par les flux dédiés.
 */
export const OPERATIONAL_STATUSES: InterventionStatus[] = [
  'new',
  'scheduled_assigned',
  'assigned',
  'on_route',
  'arrived',
  'in_progress',
];

const TERMINAL_STATUSES: InterventionStatus[] = [
  'completed',
  'cancelled',
  'complete_climbed',
  'complete_climbed_external',
  'cancelled_escalation_declined',
];

const TRANSITIONS: Partial<Record<InterventionStatus, InterventionStatus[]>> = {
  new: ['scheduled_assigned', 'assigned', 'on_route'],
  scheduled_assigned: ['assigned'],
  assigned: ['on_route', 'arrived', 'in_progress'],
  on_route: ['arrived', 'in_progress'],
  arrived: ['in_progress'],
  in_progress: ['completed'],
};

export function isTerminalStatus(status: InterventionStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Transition autorisée ? Un statut inchangé est toujours autorisé (no-op). */
export function canTransitionStatus(
  from: InterventionStatus | null | undefined,
  to: InterventionStatus | null | undefined,
): boolean {
  if (!from || !to) return false;
  if (from === to) return true;
  if (isTerminalStatus(from) || isTerminalStatus(to)) return false;
  return (TRANSITIONS[from] ?? []).includes(to);
}

/** Options de statut proposées dans l'éditeur : statut courant + transitions autorisées. */
export function nextStatuses(from: InterventionStatus): InterventionStatus[] {
  if (!from) return [];
  const options = [from, ...(TRANSITIONS[from] ?? [])];
  return Array.from(new Set(options));
}

/** Statuts réservés aux actions terrain du technicien. */
export const TECHNICIAN_ONLY_STATUSES: InterventionStatus[] = ['on_route', 'arrived', 'in_progress'];

/**
 * Options de statut selon le rôle :
 * - `technician` : toutes les transitions ;
 * - `admin`/`manager` : transitions vers les statuts « terrain » retirées
 *   (le statut courant reste toujours proposé).
 */
export function nextStatusesForRole(
  role: string | undefined,
  from: InterventionStatus,
): InterventionStatus[] {
  const options = nextStatuses(from);
  if (role === 'technician') return options;
  return options.filter((s) => s === from || !TECHNICIAN_ONLY_STATUSES.includes(s));
}

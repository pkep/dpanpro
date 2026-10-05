import type { InterventionCategory, InterventionPriority } from '@/types/intervention.types';

/** Bucket d'affichage des priorités (légende carte). */
export type PriorityBucket = 'urgent' | 'high' | 'normal';

/** Regroupe une priorité dans l'un des 3 buckets de la légende (low → normal). */
export function priorityBucket(priority: InterventionPriority): PriorityBucket {
  if (priority === 'urgent') return 'urgent';
  if (priority === 'high') return 'high';
  return 'normal';
}

export interface MapFilters {
  /** Catégories sélectionnées (tableau vide = toutes). */
  categories: InterventionCategory[];
}

interface InterventionFilterSource {
  category: InterventionCategory;
  priority: InterventionPriority;
}

/** Vrai si l'intervention passe le filtre catégories + le bucket de priorité. */
export function interventionMatchesFilters(
  intervention: InterventionFilterSource,
  filters: MapFilters,
  activeBuckets: Set<PriorityBucket> | PriorityBucket[],
): boolean {
  if (filters.categories.length > 0 && !filters.categories.includes(intervention.category)) {
    return false;
  }
  const buckets = Array.isArray(activeBuckets) ? new Set(activeBuckets) : activeBuckets;
  return buckets.has(priorityBucket(intervention.priority));
}

/**
 * Vrai si un technicien correspond aux catégories sélectionnées.
 * Un technicien est retenu si au moins une de ses compétences fait partie
 * des catégories sélectionnées. Tableau vide = tous les techniciens.
 */
export function technicianMatchesCategories(
  skills: string[] | null | undefined,
  categories: InterventionCategory[],
): boolean {
  if (categories.length === 0) return true;
  if (!skills || skills.length === 0) return false;
  return categories.some((category) => skills.includes(category));
}

/** Bascule une valeur dans un tableau (toggle immuable). */
export function toggleInArray<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];
}

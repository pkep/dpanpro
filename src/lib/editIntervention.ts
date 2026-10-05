import { z } from 'zod';
import type { InterventionPriority, InterventionStatus } from '@/types/intervention.types';
import type { Prestation } from '@/components/ClientInterface/InterventionSteps/prestations-catalog';
import { URGENCY_MULTIPLIER } from '@/components/ClientInterface/InterventionSteps/constants';

/** Sélection prestations : prestationId → varianteId ('' si aucune variante). */
export type PrestationSelection = Record<string, string>;

export interface EditSchemaOptions {
  /** Statuts proposés (statut courant + transitions autorisées). */
  allowedStatuses: InterventionStatus[];
  /** Le bénéficiaire est-il éditable (client_id null) ? */
  beneficiaryEditable: boolean;
}

/**
 * Schéma zod strict de l'édition d'intervention.
 * Règles : statut dans la liste autorisée, téléphone ≥ 10 chiffres, email valide,
 * code postal 5 chiffres, planification future non dominicale, technicien requis
 * si statut `assigned`, bénéficiaire requis si éditable.
 */
export function makeEditInterventionSchema(opts: EditSchemaOptions) {
  return z
    .object({
      status: z.string().min(1, 'Statut requis'),
      priority: z.enum(['low', 'normal', 'high', 'urgent']),
      scheduledAt: z.string().nullable().optional(), // "YYYY-MM-DDTHH:mm" | null
      address: z.string().trim().min(1, 'Adresse requise'),
      city: z.string().trim().min(1, 'Ville requise'),
      postalCode: z.string().trim().regex(/^\d{5}$/, 'Code postal invalide (5 chiffres)'),
      clientPhone: z
        .string()
        .trim()
        .refine((v) => v.replace(/\s/g, '').length >= 10, 'Téléphone invalide (10 chiffres minimum)'),
      clientEmail: z.string().trim().email('Adresse email invalide').or(z.literal('')),
      clientFirstName: z.string().optional(),
      clientLastName: z.string().optional(),
      technicianId: z.string().optional(),
      prestationIds: z.array(z.string()).optional(),
      variantes: z.record(z.string()).optional(),
      prixMin: z.number().nullable().optional(),
      prixMax: z.number().nullable().optional(),
    })
    .superRefine((val, ctx) => {
      if (!opts.allowedStatuses.includes(val.status as InterventionStatus)) {
        ctx.addIssue({ code: 'custom', path: ['status'], message: 'Transition de statut non autorisée' });
      }

      // Planification : future + pas le dimanche
      if (val.scheduledAt) {
        const date = new Date(val.scheduledAt);
        if (Number.isNaN(date.getTime())) {
          ctx.addIssue({ code: 'custom', path: ['scheduledAt'], message: 'Date invalide' });
        } else {
          if (date.getTime() <= Date.now()) {
            ctx.addIssue({ code: 'custom', path: ['scheduledAt'], message: 'La date doit être dans le futur' });
          }
          if (date.getDay() === 0) {
            ctx.addIssue({ code: 'custom', path: ['scheduledAt'], message: 'Les dimanches ne sont pas disponibles' });
          }
        }
      }

      // Technicien requis pour le statut "assigned"
      if (val.status === 'assigned' && !val.technicianId) {
        ctx.addIssue({ code: 'custom', path: ['technicianId'], message: 'Un technicien est requis pour le statut « Assigné »' });
      }

      // Bénéficiaire requis si éditable
      if (opts.beneficiaryEditable) {
        if (!val.clientFirstName?.trim()) {
          ctx.addIssue({ code: 'custom', path: ['clientFirstName'], message: 'Prénom du bénéficiaire requis' });
        }
        if (!val.clientLastName?.trim()) {
          ctx.addIssue({ code: 'custom', path: ['clientLastName'], message: 'Nom du bénéficiaire requis' });
        }
      }

      // Cohérence prix
      const min = val.prixMin ?? null;
      const max = val.prixMax ?? null;
      if (min != null && min < 0) ctx.addIssue({ code: 'custom', path: ['prixMin'], message: 'Prix minimum négatif' });
      if (max != null && max < 0) ctx.addIssue({ code: 'custom', path: ['prixMax'], message: 'Prix maximum négatif' });
      if (min != null && max != null && min > max) {
        ctx.addIssue({ code: 'custom', path: ['prixMax'], message: 'Le prix max doit être ≥ au prix min' });
      }
    });
}

export type EditInterventionFormValues = z.infer<ReturnType<typeof makeEditInterventionSchema>>;

/** Reconstruit la sélection prestation→variante depuis les libellés stockés. */
export function selectionFromAnswers(prestations: Prestation[], answers: string[] | null | undefined): PrestationSelection {
  const list = answers ?? [];
  const selection: PrestationSelection = {};
  for (const p of prestations) {
    const variante = p.variantes.find((v) => list.includes(`${p.name} — ${v.name}`));
    if (variante) {
      selection[p.id] = variante.id;
    } else if (list.includes(p.name)) {
      selection[p.id] = '';
    }
  }
  return selection;
}

export interface SelectionPricing {
  prixMin: number | null;
  prixMax: number | null;
  labels: string[];
}

/** Calcule la fourchette (prestations sélectionnées × multiplicateur d'urgence). */
export function computeSelectionPricing(
  prestations: Prestation[],
  selection: PrestationSelection,
  priority: InterventionPriority,
): SelectionPricing {
  let min = 0;
  let max = 0;
  const labels: string[] = [];

  for (const p of prestations) {
    if (!(p.id in selection)) continue;
    const variante = p.variantes.find((v) => v.id === selection[p.id]);
    if (variante) {
      min += variante.min_price;
      max += variante.max_price;
      labels.push(`${p.name} — ${variante.name}`);
    } else {
      min += p.min_price;
      max += p.max_price;
      labels.push(p.name);
    }
  }

  const multiplier = URGENCY_MULTIPLIER[priority] ?? 1;
  return {
    prixMin: labels.length > 0 ? Math.round(min * multiplier) : null,
    prixMax: labels.length > 0 ? Math.round(max * multiplier) : null,
    labels,
  };
}

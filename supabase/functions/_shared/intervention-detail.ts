/**
 * Résout le libellé « détail » d'une intervention destiné aux documents PDF.
 *
 * Priorité : `description` non vide, puis premier élément non vide de
 * `questionnaire_answers`. Retourne null si aucune information.
 */
export interface InterventionDetailSource {
  description?: string | null;
  questionnaire_answers?: unknown;
}

function firstNonEmptyAnswer(answers: unknown): string | null {
  if (Array.isArray(answers)) {
    for (const answer of answers) {
      if (typeof answer === "string" && answer.trim()) return answer.trim();
    }
    return null;
  }
  if (typeof answers === "string") {
    try {
      const parsed = JSON.parse(answers);
      if (Array.isArray(parsed)) {
        for (const answer of parsed) {
          if (typeof answer === "string" && answer.trim()) return answer.trim();
        }
      }
    } catch {
      // Pas du JSON : on ignore.
    }
  }
  return null;
}

export function resolveInterventionDetail(
  intervention: InterventionDetailSource | null | undefined,
): string | null {
  if (!intervention) return null;
  const description = typeof intervention.description === "string"
    ? intervention.description.trim()
    : "";
  if (description) return description;
  return firstNonEmptyAnswer(intervention.questionnaire_answers);
}

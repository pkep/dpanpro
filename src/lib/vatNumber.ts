/**
 * Numéro de TVA intracommunautaire.
 *
 * La saisie libre arrive avec des espaces, des points ou des tirets. On stocke
 * une forme compactée en majuscules, et `null` quand rien n'est saisi
 * (la colonne est facultative).
 */
export function normalizeVatNumber(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).toUpperCase().replace(/[\s.\-\u00A0]/g, '');
  return cleaned.length > 0 ? cleaned : null;
}

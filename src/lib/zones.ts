/**
 * Zones d'intervention d'un partenaire.
 *
 * La colonne `partner_applications.zone` est un tableau Postgres : elle peut
 * revenir côté client sous forme de tableau JS, de littéral Postgres `{75,92}`
 * ou de valeur vide. `normalizeZones` ramène tout ça à une liste de strings.
 */
export function normalizeZones(value: unknown): string[] {
  if (value === null || value === undefined) return [];

  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/^"|"$/g, ''))
        .filter(Boolean);
    }
    return [trimmed];
  }

  return [];
}

/**
 * Valide un numéro WhatsApp d'agent au format E.164.
 * L'indicatif pays est obligatoire (ex. +33 6 12 34 56 78).
 */
export function normalizeWhatsAppAgentPhone(value: string): string | null {
  const compact = value.replace(/[\s().-]/g, '');

  if (!/^\+[1-9]\d{7,14}$/.test(compact)) return null;

  return compact;
}

/** Format stocké en base et utilisé dans les liens wa.me (sans '+'). */
export function toStoredWhatsAppPhone(value: string): string {
  return value.replace(/\D/g, '');
}

/** Formate un numéro français en groupes de deux chiffres (06 08 02 02 02). */
export function formatFrenchPhone(phone?: string | null): string {
  if (!phone) return '—';

  const cleaned = phone.trim().replace(/[^\d+]/g, '');
  let digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;

  if (digits.startsWith('0033')) {
    digits = '0' + digits.slice(4);
  } else if (digits.startsWith('33')) {
    digits = '0' + digits.slice(2);
  }

  if (!/^0\d{9}$/.test(digits)) return phone.trim();
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ');
}

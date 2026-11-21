const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseTimeToMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Indique si le support WhatsApp est ouvert dans le fuseau configuré.
 *
 * Retourne `null` si la configuration est absente ou invalide, afin que
 * l'appelant puisse choisir un comportement de repli (bouton visible).
 */
export function isWhatsAppOpen(
  now: Date,
  open: string,
  close: string,
  timeZone: string
): boolean | null {
  const openMinutes = parseTimeToMinutes(open);
  const closeMinutes = parseTimeToMinutes(close);

  if (openMinutes === null || closeMinutes === null) return null;
  if (openMinutes >= closeMinutes) return null;

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    return null;
  }

  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;

  const currentMinutes = hour * 60 + minute;
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

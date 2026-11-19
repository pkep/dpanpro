export type QualificationErrorCode = 'PROFILE_INCOMPLETE' | 'INVALID_STATUS' | 'UNKNOWN';

const KNOWN_CODES: readonly string[] = ['PROFILE_INCOMPLETE', 'INVALID_STATUS'];

function asCode(value: unknown): QualificationErrorCode {
  const raw = String(value ?? '').toUpperCase().trim();
  return KNOWN_CODES.includes(raw) ? (raw as QualificationErrorCode) : 'UNKNOWN';
}

function asFields(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return [];
}

/**
 * Erreur de qualification d'une candidature technicien.
 *
 * Deux origines : les RPC Postgres (`accept_technician_application`,
 * `validate_technician_qualification`, SECURITY DEFINER) et le gateway Spring
 * (409). Les deux renvoient un code et, pour `PROFILE_INCOMPLETE`, la liste des
 * champs manquants.
 */
export class QualificationError extends Error {
  readonly code: QualificationErrorCode;
  readonly missingFields: string[];

  constructor(code: QualificationErrorCode, message: string, missingFields: string[] = []) {
    super(message);
    this.name = 'QualificationError';
    this.code = code;
    this.missingFields = missingFields;
    Object.setPrototypeOf(this, QualificationError.prototype);
  }

  /** Message d'exception Postgres : `CODE: détails`, JSON `{code, missingFields}` ou texte libre. */
  static fromPostgresMessage(message: string): QualificationError {
    const raw = String(message ?? '').trim();
    if (!raw) return new QualificationError('UNKNOWN', 'Erreur lors de la qualification');

    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw) as { code?: unknown; missingFields?: unknown; message?: unknown };
        return new QualificationError(
          asCode(parsed.code),
          String(parsed.message ?? raw),
          asFields(parsed.missingFields),
        );
      } catch {
        // pas du JSON : on retombe sur la lecture textuelle
      }
    }

    const [head, ...rest] = raw.split(':');
    const code = asCode(head);
    const details = rest.join(':').trim();

    if (code !== 'UNKNOWN') {
      return new QualificationError(code, details || raw, code === 'PROFILE_INCOMPLETE' ? asFields(details) : []);
    }
    if (/incomplet|missing/i.test(raw)) {
      return new QualificationError('PROFILE_INCOMPLETE', raw, asFields(details || raw));
    }
    if (/statut|status/i.test(raw)) {
      return new QualificationError('INVALID_STATUS', raw);
    }
    return new QualificationError('UNKNOWN', raw);
  }

  /** Corps d'erreur du gateway Spring (409) : `{ code | errorCode, missingFields, message }`. */
  static fromApiResponse(body: unknown, message: string): QualificationError {
    if (body && typeof body === 'object') {
      const b = body as Record<string, unknown>;
      const code = asCode(b.code ?? b.errorCode ?? b.status);
      const fields = asFields(b.missingFields ?? b.missing_fields);
      const text = String(b.message ?? b.detail ?? b.error ?? message ?? '');
      if (code !== 'UNKNOWN') return new QualificationError(code, text, fields);
      return new QualificationError('UNKNOWN', text || String(message ?? ''));
    }
    return QualificationError.fromPostgresMessage(String(body ?? message ?? ''));
  }
}

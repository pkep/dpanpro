export interface IncompleteTechnicianProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
  missingFields: string[];
}

export interface TechnicianProfileFields {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  passwordHash?: string | null;
  hasApplication?: boolean;
  bankAccountHolder?: string | null;
  bankName?: string | null;
  iban?: string | null;
  bic?: string | null;
}

export function computeMissingProfileFields(profile: TechnicianProfileFields): string[] {
  const required = {
    firstName: profile.firstName,
    lastName: profile.lastName,
    avatar: profile.avatarUrl,
    password: profile.passwordHash,
    bankAccountHolder: profile.bankAccountHolder,
    bankName: profile.bankName,
    iban: profile.iban,
    bic: profile.bic,
  };
  const missing = Object.entries(required).filter(([, value]) => !value?.trim()).map(([key]) => key);
  if (!profile.hasApplication) missing.push('application');
  return missing;
}

export function isProfileComplete(missingFields: readonly string[]): boolean {
  return missingFields.length === 0;
}

/** Champs dont l'absence bloque la validation d'une candidature. */
export const REQUIRED_PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'avatar',
  'password',
  'bankAccountHolder',
  'bankName',
  'iban',
  'bic',
  'application',
] as const;

/** true si l'absence de ce champ empêche de valider la candidature. */
export function isProfileFieldRequired(field: string): boolean {
  return (REQUIRED_PROFILE_FIELDS as readonly string[]).includes(field);
}
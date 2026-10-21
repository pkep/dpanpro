export interface TechnicianProfileInput {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  passwordHash?: string | null;
  hasApplication: boolean;
  bankAccountHolder?: string | null;
  bankName?: string | null;
  iban?: string | null;
  bic?: string | null;
}

export interface IncompleteTechnicianProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
  missingFields: string[];
}

export function computeMissingProfileFields(profile: TechnicianProfileInput): string[] {
  const missing: string[] = [];
  const fields = ['firstName', 'lastName', 'avatarUrl', 'passwordHash'] as const;
  for (const field of fields) {
    if (!profile[field]?.trim()) missing.push(field);
  }
  if (!profile.hasApplication) missing.push('application');
  const bankFields = ['bankAccountHolder', 'bankName', 'iban', 'bic'] as const;
  for (const field of bankFields) {
    if (!profile[field]?.trim()) missing.push(field);
  }
  return missing;
}

export function isProfileComplete(missingFields: readonly string[]): boolean {
  return missingFields.length === 0;
}
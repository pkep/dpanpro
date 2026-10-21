import { describe, expect, it } from 'vitest';
import { computeMissingProfileFields, isProfileComplete } from './technicianProfileCompleteness';

const complete = {
  firstName: 'Alice', lastName: 'Martin', avatarUrl: '/photo.jpg', passwordHash: 'hashed',
  hasApplication: true, bankAccountHolder: 'Alice Martin', bankName: 'Bank', iban: 'FR123', bic: 'BANKFR',
};

describe('technician profile compatibility', () => {
  it('recognizes all populated profile fields', () => {
    expect(computeMissingProfileFields(complete)).toEqual([]);
    expect(isProfileComplete([])).toBe(true);
  });
  it('returns a missing banking field rather than marking the profile complete', () => {
    const fields = computeMissingProfileFields({ ...complete, iban: '   ' });
    expect(fields).toEqual(['iban']);
    expect(isProfileComplete(fields)).toBe(false);
  });
});
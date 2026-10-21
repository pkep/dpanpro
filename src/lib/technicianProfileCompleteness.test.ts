import { describe, expect, it } from 'vitest';
import { computeMissingProfileFields, isProfileComplete } from './technicianProfileCompleteness';

describe('profile completeness helper compatibility', () => {
  const profile = {
    firstName: 'Jean', lastName: 'Martin', avatarUrl: '/avatar.png', passwordHash: 'hash',
    hasApplication: true, bankAccountHolder: 'Jean Martin', bankName: 'Banque', iban: 'FR123', bic: 'BANKFR',
  };
  it('accepts populated service fields', () => {
    expect(computeMissingProfileFields(profile)).toEqual([]);
    expect(isProfileComplete(computeMissingProfileFields(profile))).toBe(true);
  });
  it('reports blank values rather than accepting whitespace', () => {
    expect(computeMissingProfileFields({ ...profile, iban: '  ' })).toEqual(['iban']);
    expect(isProfileComplete(['iban'])).toBe(false);
  });
});
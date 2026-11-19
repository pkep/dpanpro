import { describe, expect, it } from 'vitest';
import { normalizeVatNumber } from './vatNumber';

describe('normalizeVatNumber', () => {
  it('compacts and uppercases a typed number', () => {
    expect(normalizeVatNumber(' fr 12 345 678 90 ')).toBe('FR1234567890');
  });
  it('keeps an already compact number', () => {
    expect(normalizeVatNumber('FR1234567890')).toBe('FR1234567890');
  });
  it('returns null when nothing is typed', () => {
    expect(normalizeVatNumber(null)).toBeNull();
    expect(normalizeVatNumber(undefined)).toBeNull();
    expect(normalizeVatNumber('   ')).toBeNull();
  });
});

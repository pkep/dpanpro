import { describe, expect, it } from 'vitest';
import { normalizeZones } from './zones';

describe('normalizeZones', () => {
  it('accepts a JS array and drops blank entries', () => {
    expect(normalizeZones(['75', ' 92 ', ''])).toEqual(['75', '92']);
  });
  it('reads a Postgres array literal', () => {
    expect(normalizeZones('{75,"92",93}')).toEqual(['75', '92', '93']);
  });
  it('keeps a plain string as a single zone', () => {
    expect(normalizeZones('75')).toEqual(['75']);
  });
  it('returns an empty list for null, undefined or blank', () => {
    expect(normalizeZones(null)).toEqual([]);
    expect(normalizeZones(undefined)).toEqual([]);
    expect(normalizeZones('   ')).toEqual([]);
  });
});

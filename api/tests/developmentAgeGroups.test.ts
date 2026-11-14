import { describe, expect, it } from 'vitest';
import { developmentBandsForCategory, type DevelopmentAgeGroup } from '../../shared/types/developmentAgeGroups.js';

const bands: DevelopmentAgeGroup[] = [
  { id: 'age_6_8', minAge: 6, maxAge: 8, active: true },
  { id: 'age_9_10', minAge: 9, maxAge: 10, active: true },
  { id: 'age_11_12', minAge: 11, maxAge: 12, active: true },
  { id: 'age_13_15', minAge: 13, maxAge: 15, active: true },
  { id: 'age_16_plus', minAge: 16, maxAge: null, active: true },
];

describe('development age bands', () => {
  it.each([
    ['Beeball', ['age_6_8']],
    ['U12', ['age_6_8', 'age_9_10', 'age_11_12']],
    ['U15', ['age_11_12', 'age_13_15']],
    ['U21', ['age_13_15', 'age_16_plus']],
    ['Senioren', ['age_16_plus']],
  ] as const)('maps overlapping bands for %s', (category, expected) => {
    expect(developmentBandsForCategory(category, bands).map(band => band.id)).toEqual(expected);
  });

  it('uses the edited boundaries rather than a fixed age-band ID mapping', () => {
    const changed = [{ id: 'new-band', minAge: 7, maxAge: 7, active: true }];
    expect(developmentBandsForCategory('Beeball', changed)).toEqual(changed);
    expect(developmentBandsForCategory('U12', changed)).toEqual(changed);
    expect(developmentBandsForCategory('U15', changed)).toEqual([]);
  });

  it('excludes inactive age bands and rejects invalid intervals', () => {
    expect(developmentBandsForCategory('U12', [{ id: 'inactive', minAge: 7, maxAge: 12, active: false }])).toEqual([]);
    expect(() => developmentBandsForCategory('U12', [{ id: 'invalid', minAge: 13, maxAge: 7, active: true }])).toThrow('Ongeldige leeftijdsband');
  });
});

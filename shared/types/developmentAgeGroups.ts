import type { AgeGroupId } from './entities.js';

export interface DevelopmentAgeGroup {
  id: string;
  minAge: number;
  maxAge: number | null;
  active: boolean;
}

const categoryAgeRanges: Record<AgeGroupId, { minAge: number; maxAge: number | null }> = {
  Beeball: { minAge: 0, maxAge: 7 },
  U12: { minAge: 7, maxAge: 12 },
  U15: { minAge: 12, maxAge: 15 },
  U21: { minAge: 15, maxAge: 21 },
  Senioren: { minAge: 21, maxAge: null },
};

export function developmentBandsForCategory<T extends DevelopmentAgeGroup>(
  category: AgeGroupId,
  ageGroups: readonly T[],
): T[] {
  const range = categoryAgeRanges[category];
  return ageGroups.filter(group => {
    if (!Number.isFinite(group.minAge) || group.minAge < 0 ||
        (group.maxAge !== null && (!Number.isFinite(group.maxAge) || group.maxAge < group.minAge))) {
      throw new Error(`Ongeldige leeftijdsband: ${group.id}`);
    }
    return group.active &&
      group.minAge <= (range.maxAge ?? Infinity) &&
      range.minAge <= (group.maxAge ?? Infinity);
  });
}

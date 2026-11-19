/** Libellé d'expérience affiché sur les cartes techniciens. */
export function formatTechnicianExperience(years?: number | null): string {
  const value = years ?? 0;
  if (value <= 0) return "Moins d'1 an";
  if (value <= 3) return '1 à 3 ans';
  if (value <= 5) return '3 à 5 ans';
  if (value <= 10) return '5 à 10 ans';
  return '+10 ans';
}

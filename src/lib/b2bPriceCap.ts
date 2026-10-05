/**
 * Plafond de prix B2B.
 *
 * Une intervention B2B ne peut être validée si le total TTC du devis dépasse
 * `b2bPriceCap × marge`. La marge est paramétrable côté backend
 * (`app.b2b.price-cap-margin`, défaut 1.20) ; le frontend reflète ce défaut.
 */
export const B2B_PRICE_CAP_MARGIN = 1.2;

/** Plafond effectif (avec marge) à partir du plafond saisi. */
export function b2bEffectiveCap(cap: number): number {
  return Math.round(cap * B2B_PRICE_CAP_MARGIN * 100) / 100;
}

/** Vrai si le total TTC du devis dépasse le plafond effectif. */
export function isB2bCapExceeded(totalTtc: number, cap: number | null | undefined): boolean {
  if (cap == null) return false;
  return totalTtc > b2bEffectiveCap(cap) + 1e-9;
}

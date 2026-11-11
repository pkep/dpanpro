/**
 * Règle TVA des documents B2B : 20 % par défaut, autoliquidation (0 %) pour les
 * partenaires « entreprise de construction ».
 */
export const B2B_VAT_RATE = 20;
export const B2B_VAT_DIVISOR = 1.2;

export interface B2bVat {
  vatAmount: number;
  totalTtc: number;
  vatRate: number;
  vatExempt: boolean;
}

export function computeB2bVat(totalHt: number, constructionCompany: boolean): B2bVat {
  const base = Math.round(Number(totalHt ?? 0) * 100) / 100;
  const vatExempt = constructionCompany === true;

  if (vatExempt) {
    return { vatAmount: 0, totalTtc: base, vatRate: 0, vatExempt: true };
  }

  const vatAmount = Math.round(base * (B2B_VAT_RATE / 100) * 100) / 100;
  const totalTtc = Math.round((base + vatAmount) * 100) / 100;
  return { vatAmount, totalTtc, vatRate: B2B_VAT_RATE, vatExempt: false };
}

/**
 * Convertit un montant TTC (prix final/estimé d'une intervention) en HT.
 * Autoliquidation (construction) : TVA 0 %, donc HT = TTC.
 */
export function toB2bHtFromTtc(ttc: number, constructionCompany: boolean): number {
  const value = Math.round(Number(ttc ?? 0) * 100) / 100;
  if (constructionCompany === true) return value;
  return Math.round((value / B2B_VAT_DIVISOR) * 100) / 100;
}

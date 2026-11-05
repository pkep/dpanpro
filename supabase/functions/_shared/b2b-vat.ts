/**
 * Règle TVA des documents B2B : 20 % par défaut, autoliquidation (0 %) pour les
 * partenaires « entreprise de construction ».
 */
export const B2B_VAT_RATE = 20;

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

/**
 * TVA des documents B2B.
 *
 * Règle : 20 % pour un B2B standard, 0 % pour une entreprise de construction
 * (autoliquidation, art. 283-2 nonies du CGI). Le taux B2B ne dépend pas du
 * statut « société » du client : il dépend du type de facturation.
 */
export const B2B_VAT_RATE = 20;

export interface VatRateServiceSource {
  vatRateIndividual?: number | null;
  vatRateProfessional?: number | null;
}

export interface VatRateSource {
  isB2b: boolean;
  constructionCompany?: boolean;
  service?: VatRateServiceSource | null;
  isCompany?: boolean;
}

/** Résout le taux de TVA applicable à un devis / une facture. */
export function resolveVatRate({
  isB2b,
  constructionCompany = false,
  service,
  isCompany = false,
}: VatRateSource): number {
  if (isB2b) {
    return constructionCompany ? 0 : B2B_VAT_RATE;
  }
  if (isCompany) {
    return service?.vatRateProfessional ?? 20;
  }
  return service?.vatRateIndividual ?? 10;
}

/** Convertit un montant TTC en HT pour un taux de TVA donné (arrondi au centime). */
export function toHtFromTtc(ttc: number, vatRate: number): number {
  return Math.round((ttc / (1 + vatRate / 100)) * 100) / 100;
}

/** Convertit un montant HT en TTC pour un taux de TVA donné (arrondi au centime). */
export function toTtcFromHt(ht: number, vatRate: number): number {
  const vatAmount = Math.round(ht * (vatRate / 100) * 100) / 100;
  return Math.round((ht + vatAmount) * 100) / 100;
}

import type { AffiliateCampaign } from '@/services/interfaces/affiliate-campaign.interface';

/** Arrondi demi-supérieur au centime. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Une campagne est active si non suspendue et dans sa fenêtre (ou permanente). */
export function isCampaignActive(campaign: AffiliateCampaign, now: Date = new Date()): boolean {
  if (campaign.isSuspended) return false;
  if (campaign.isPermanent) return true;
  if (!campaign.startDate || !campaign.endDate) return false;
  const t = now.getTime();
  return t >= new Date(campaign.startDate).getTime() && t <= new Date(campaign.endDate).getTime();
}

/** Normalise un code promo (MAJUSCULES, trim). */
export function normalizeCampaignCode(code?: string | null): string {
  return (code ?? '').trim().toUpperCase();
}

/** Une campagne à code n'est débloquée que si le code fourni correspond. */
export function isCampaignUnlocked(campaign: AffiliateCampaign, promoCode?: string | null): boolean {
  if (!campaign.requiresCode) return true;
  const code = normalizeCampaignCode(promoCode);
  return code.length > 0 && normalizeCampaignCode(campaign.code) === code;
}

/**
 * Sélectionne les campagnes à appliquer :
 * - la plus récente campagne EXCLUSIVE (can_combine = false), s'il y en a une ;
 * - puis toutes les COMBINABLES (can_combine = true), triées par created_at ASC.
 * Les campagnes `requiresCode` ne sont incluses que si `promoCode` correspond.
 */
export function resolveActiveCampaigns(
  campaigns: AffiliateCampaign[],
  now: Date = new Date(),
  promoCode?: string | null,
): AffiliateCampaign[] {
  const active = campaigns.filter(
    (c) => isCampaignActive(c, now) && isCampaignUnlocked(c, promoCode),
  );

  const exclusive = active
    .filter((c) => !c.canCombine)
    .sort((a, b) => {
      const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
      if (bStart !== aStart) return bStart - aStart;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];

  const combinables = active
    .filter((c) => c.canCombine)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return exclusive ? [exclusive, ...combinables] : combinables;
}

export interface AppliedCampaign {
  campaign: AffiliateCampaign;
  baseAmount: number;
  discountAmount: number;
}

export interface CampaignDiscountResult {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  applied: AppliedCampaign[];
}

/** Applique les remises séquentiellement, avec arrondi à chaque étape et bornage à 0. */
export function applyCampaignDiscounts(
  baseAmount: number,
  campaigns: AffiliateCampaign[],
): CampaignDiscountResult {
  const originalAmount = round2(baseAmount);
  let total = originalAmount;
  const applied: AppliedCampaign[] = [];

  for (const campaign of campaigns) {
    const base = total;
    let discount =
      campaign.commissionType === 'percentage'
        ? round2((base * campaign.commissionValue) / 100)
        : round2(campaign.commissionValue);
    discount = Math.min(Math.max(discount, 0), base);
    total = round2(base - discount);
    applied.push({ campaign, baseAmount: base, discountAmount: discount });
  }

  return {
    originalAmount,
    discountAmount: round2(originalAmount - total),
    finalAmount: total,
    applied,
  };
}

/** Résolution + application en une passe (affichage wizard). */
export function computeCampaignDiscount(
  campaigns: AffiliateCampaign[],
  baseAmount: number,
  now: Date = new Date(),
  promoCode?: string | null,
): CampaignDiscountResult {
  return applyCampaignDiscounts(baseAmount, resolveActiveCampaigns(campaigns, now, promoCode));
}

export type CampaignCommissionType = 'percentage' | 'fixed';

export interface AffiliateCampaign {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isPermanent: boolean;
  isSuspended: boolean;
  canCombine: boolean;
  /** Code promo unique (facultatif) — utilisé par le flyer QR et la redemption. */
  code: string | null;
  /** true = la campagne ne s'applique que si le code promo est fourni. */
  requiresCode: boolean;
  commissionType: CampaignCommissionType;
  commissionValue: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AffiliateCampaignInput {
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  isPermanent: boolean;
  canCombine: boolean;
  code?: string | null;
  requiresCode: boolean;
  commissionType: CampaignCommissionType;
  commissionValue: number;
}

export interface AffiliateCampaignStats {
  totalDiscountHt: number;
  campaignInterventions: number;
  avgDiscountHt: number;
  netRevenue: number;
  perCampaign: {
    campaignId: string | null;
    name: string;
    interventionCount: number;
    totalDiscountHt: number;
    netRevenue: number;
  }[];
  series?: { date: string; discountHt: number; interventions: number }[];
}

export interface CampaignStatsParams {
  period: 'all' | 'year' | 'month' | 'range';
  year?: number;
  month?: number;
  from?: string;
  to?: string;
  campaignId?: string;
}

export interface IAffiliateCampaignService {
  getCampaigns(params: { page: number; size: number; search?: string }): Promise<{
    content: AffiliateCampaign[];
    totalElements: number;
    totalPages: number;
  }>;
  getCampaign(id: string): Promise<AffiliateCampaign>;
  /** Campagnes non suspendues (le filtrage de fenêtre est fait côté résolution). */
  getActiveCampaigns(): Promise<AffiliateCampaign[]>;
  createCampaign(input: AffiliateCampaignInput): Promise<AffiliateCampaign>;
  updateCampaign(
    id: string,
    input: Partial<AffiliateCampaignInput> & { isSuspended?: boolean },
  ): Promise<AffiliateCampaign>;
  suspendCampaign(id: string): Promise<void>;
  resumeCampaign(id: string): Promise<void>;
  deleteCampaign(id: string): Promise<void>;
  getStats(params: CampaignStatsParams): Promise<AffiliateCampaignStats>;
  /** Envoie le flyer QR par email (destinataire fourni : aucune email stockée sur la campagne). */
  sendEmail(id: string, email: string): Promise<void>;
  /** Envoie le lien promo par SMS (numéro fourni). */
  sendSms(id: string, phone: string): Promise<void>;
}

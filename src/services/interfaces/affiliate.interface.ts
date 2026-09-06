export interface Affiliate {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  code: string;
  commissionType: 'percentage' | 'fixed';
  commissionValue: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AffiliateInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  commissionType: 'percentage' | 'fixed';
  commissionValue: number;
  notes?: string | null;
}

export interface AffiliateTransaction {
  id: string;
  affiliateId: string;
  affiliateCode?: string;
  interventionId: string;
  commissionType: 'percentage' | 'fixed';
  commissionValue: number;
  revenueAmount: number;
  commissionAmount: number;
  status: 'pending' | 'confirmed' | 'paid';
  trackingCode?: string;
  createdAt: string;
  confirmedAt: string | null;
  paidAt: string | null;
}

export interface AffiliatePerStats {
  affiliateId: string;
  firstName: string;
  lastName: string;
  code: string;
  transactionCount: number;
  revenue: number;
  commission: number;
}

export interface AffiliateStats {
  totalRevenue: number;
  totalCommission: number;
  transactionCount: number;
  perAffiliate: AffiliatePerStats[];
}

export interface MonthlyAggregate {
  affiliateId: string;
  firstName: string;
  lastName: string;
  code: string;
  transactionCount: number;
  revenue: number;
  commission: number;
  status: string;
}

export interface IAffiliateService {
  getAffiliates(params: { page: number; size: number; search?: string }): Promise<{
    content: Affiliate[];
    totalElements: number;
    totalPages: number;
  }>;
  getAffiliate(id: string): Promise<Affiliate>;
  createAffiliate(input: AffiliateInput): Promise<Affiliate>;
  updateAffiliate(id: string, input: Partial<AffiliateInput>): Promise<Affiliate>;
  deleteAffiliate(id: string): Promise<void>;
  validateCode(code: string): Promise<{ valid: boolean; affiliateName?: string }>;
  sendSms(id: string): Promise<void>;
  sendEmail(id: string): Promise<void>;
  getTransactions(
    id: string,
    params: { page: number; size: number }
  ): Promise<{ content: AffiliateTransaction[]; totalElements: number; totalPages: number }>;
  getStats(params: {
    period: 'all' | 'year' | 'month' | 'range';
    year?: number;
    month?: number;
    from?: string;
    to?: string;
    affiliateId?: string;
  }): Promise<AffiliateStats>;
  getMonthlyAggregates(year: number, month: number): Promise<MonthlyAggregate[]>;
  validateMonth(affiliateId: string, year: number, month: number): Promise<void>;
  payMonth(affiliateId: string, year: number, month: number): Promise<void>;
}

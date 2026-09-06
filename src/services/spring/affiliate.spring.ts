import type {
  Affiliate,
  AffiliateInput,
  AffiliateStats,
  AffiliateTransaction,
  IAffiliateService,
  MonthlyAggregate,
} from '@/services/interfaces/affiliate.interface';

export class SpringAffiliateService implements IAffiliateService {
  async getAffiliates(): Promise<{ content: Affiliate[]; totalElements: number; totalPages: number }> {
    throw new Error('Affiliate service not implemented in Spring mode');
  }

  async getAffiliate(): Promise<Affiliate> {
    throw new Error('Affiliate service not implemented in Spring mode');
  }

  async createAffiliate(): Promise<Affiliate> {
    throw new Error('Affiliate service not implemented in Spring mode');
  }

  async updateAffiliate(): Promise<Affiliate> {
    throw new Error('Affiliate service not implemented in Spring mode');
  }

  async deleteAffiliate(): Promise<void> {
    throw new Error('Affiliate service not implemented in Spring mode');
  }

  async validateCode(): Promise<{ valid: boolean; affiliateName?: string }> {
    throw new Error('Affiliate service not implemented in Spring mode');
  }

  async sendSms(): Promise<void> {
    throw new Error('Affiliate service not implemented in Spring mode');
  }

  async sendEmail(): Promise<void> {
    throw new Error('Affiliate service not implemented in Spring mode');
  }

  async getTransactions(): Promise<{
    content: AffiliateTransaction[];
    totalElements: number;
    totalPages: number;
  }> {
    throw new Error('Affiliate service not implemented in Spring mode');
  }

  async getStats(): Promise<AffiliateStats> {
    throw new Error('Affiliate service not implemented in Spring mode');
  }

  async getMonthlyAggregates(): Promise<MonthlyAggregate[]> {
    throw new Error('Affiliate service not implemented in Spring mode');
  }

  async validateMonth(): Promise<void> {
    throw new Error('Affiliate service not implemented in Spring mode');
  }

  async payMonth(): Promise<void> {
    throw new Error('Affiliate service not implemented in Spring mode');
  }
}

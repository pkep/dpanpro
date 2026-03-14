export interface Payout {
  id: string;
  technicianId: string;
  amount: number;
  payoutDate: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields (optional)
  technicianName?: string;
}

export interface CreatePayoutInput {
  technicianId: string;
  amount: number;
  payoutDate: string;
  periodStart: string;
  periodEnd: string;
  notes?: string;
}

export interface IPayoutsService {
  getPayouts(filters?: { status?: string }): Promise<Payout[]>;
  createPayout(input: CreatePayoutInput): Promise<Payout>;
  updatePayoutStatus(id: string, status: string, paidAt?: string): Promise<void>;
}

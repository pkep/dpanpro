export interface Dispute {
  id: string;
  interventionId: string;
  clientId: string | null;
  technicianId: string | null;
  status: string;
  clientNotes: string | null;
  technicianNotes: string | null;
  adminNotes: string | null;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  refundAmount: number | null;
  refundType: string | null;
  refundStripeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDisputeInput {
  interventionId: string;
  clientNotes?: string;
  technicianNotes?: string;
}

export interface ResolveDisputeInput {
  adminNotes: string;
  resolution: string; // 'refund' | 'partial_refund' | 'no_action'
}

export interface IDisputesService {
  getDisputes(filters?: { status?: string }): Promise<Dispute[]>;
  createDispute(input: CreateDisputeInput): Promise<Dispute>;
  resolveDispute(id: string, input: ResolveDisputeInput): Promise<void>;
}

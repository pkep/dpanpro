export interface CancellationResult {
  success: boolean;
  hasFees: boolean;
  feeAmount?: number;
  invoiceSent?: boolean;
  error?: string;
}

export interface ICancellationService {
  cancelInterventionWithFees(interventionId: string, reason: string, forceChargeFees?: boolean): Promise<CancellationResult>;
}

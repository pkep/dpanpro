import type { CancellationResult } from '@/services/cancellation/cancellation.service';

export interface ICancellationService {
  cancelInterventionWithFees(interventionId: string, reason: string, forceChargeFees?: boolean): Promise<CancellationResult>;
}

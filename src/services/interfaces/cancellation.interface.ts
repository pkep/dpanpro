import type { CancellationResult } from '@/services/supabase/cancellation.service';

export interface ICancellationService {
  cancelInterventionWithFees(interventionId: string, reason: string, forceChargeFees?: boolean): Promise<CancellationResult>;
}

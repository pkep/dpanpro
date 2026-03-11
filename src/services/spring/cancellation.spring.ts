import type { ICancellationService } from '@/services/interfaces/cancellation.interface';
import type { CancellationResult } from '@/services/cancellation/cancellation.service';
import { springHttp } from './http-client';

export class SpringCancellationService implements ICancellationService {
  // POST /cancellation/cancel-with-fees
  async cancelInterventionWithFees(interventionId: string, reason: string, forceChargeFees?: boolean): Promise<CancellationResult> {
    return springHttp.post('/cancellation/cancel-with-fees', { interventionId, reason, forceChargeFees });
  }
}

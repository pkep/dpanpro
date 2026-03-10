import type { IDispatchService } from '@/services/interfaces/dispatch.interface';
import type { DispatchResult, DispatchAttempt } from '@/services/dispatch/dispatch.service';
import { springHttp } from './http-client';

export class SpringDispatchService implements IDispatchService {
  async dispatchIntervention(interventionId: string): Promise<DispatchResult> {
    return springHttp.post<DispatchResult>('/dispatch', { interventionId, action: 'dispatch' });
  }
  async acceptAssignment(interventionId: string, technicianId: string): Promise<DispatchResult> {
    return springHttp.post<DispatchResult>('/dispatch', { interventionId, technicianId, action: 'accept' });
  }
  async rejectAssignment(interventionId: string, technicianId: string): Promise<DispatchResult> {
    return springHttp.post<DispatchResult>('/dispatch', { interventionId, technicianId, action: 'reject' });
  }
  async declineIntervention(interventionId: string, technicianId: string, reason: string): Promise<DispatchResult> {
    return springHttp.post<DispatchResult>('/dispatch', { interventionId, technicianId, action: 'decline', reason });
  }
  async cancelAssignment(interventionId: string, technicianId: string, reason: string): Promise<DispatchResult> {
    return springHttp.post<DispatchResult>('/dispatch', { interventionId, technicianId, action: 'cancel', reason });
  }
  async goToIntervention(interventionId: string, technicianId: string): Promise<DispatchResult> {
    return springHttp.post<DispatchResult>('/dispatch', { interventionId, technicianId, action: 'go' });
  }
  async notifyTechnicians(interventionId: string): Promise<DispatchResult> {
    return springHttp.post<DispatchResult>('/dispatch', { interventionId, action: 'notify' });
  }
  async getDispatchAttempts(interventionId: string): Promise<DispatchAttempt[]> {
    return springHttp.get<DispatchAttempt[]>(`/dispatch/attempts/${interventionId}`);
  }
  async getCurrentAttempt(interventionId: string): Promise<DispatchAttempt | null> {
    return springHttp.get<DispatchAttempt | null>(`/dispatch/attempts/${interventionId}/current`);
  }
  async getTechnicianPendingAssignments(technicianId: string): Promise<DispatchAttempt[]> {
    return springHttp.get<DispatchAttempt[]>(`/dispatch/technician/${technicianId}/pending`);
  }
}

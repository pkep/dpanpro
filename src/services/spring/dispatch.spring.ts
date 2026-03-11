import type { IDispatchService } from '@/services/interfaces/dispatch.interface';
import type { DispatchResult, DispatchAttempt } from '@/services/dispatch/dispatch.service';
import { springHttp } from './http-client';

export class SpringDispatchService implements IDispatchService {
  // POST /dispatch/interventions/{id}/start
  async dispatchIntervention(interventionId: string): Promise<DispatchResult> {
    return springHttp.post<DispatchResult>(`/dispatch/interventions/${interventionId}/start`);
  }

  // POST /dispatch/interventions/{id}/manual
  async manualDispatch(interventionId: string, technicianId: string): Promise<DispatchResult> {
    return springHttp.post<DispatchResult>(`/dispatch/interventions/${interventionId}/manual`, { technicianId });
  }

  // POST /dispatch/interventions/{id}/accept
  async acceptAssignment(interventionId: string, _technicianId: string): Promise<DispatchResult> {
    return springHttp.post<DispatchResult>(`/dispatch/interventions/${interventionId}/accept`);
  }

  // POST /dispatch/interventions/{id}/reject
  async rejectAssignment(interventionId: string, _technicianId: string): Promise<DispatchResult> {
    return springHttp.post<DispatchResult>(`/dispatch/interventions/${interventionId}/reject`);
  }

  // POST /dispatch/interventions/{id}/reject (with reason = decline)
  async declineIntervention(interventionId: string, _technicianId: string, reason: string): Promise<DispatchResult> {
    return springHttp.post<DispatchResult>(`/dispatch/interventions/${interventionId}/reject`, { reason });
  }

  // No separate cancel endpoint in v2 — use reject
  async cancelAssignment(interventionId: string, _technicianId: string, reason: string): Promise<DispatchResult> {
    return springHttp.post<DispatchResult>(`/dispatch/interventions/${interventionId}/reject`, { reason });
  }

  // POST /dispatch/interventions/{id}/go
  async goToIntervention(interventionId: string, _technicianId: string): Promise<DispatchResult> {
    return springHttp.post<DispatchResult>(`/dispatch/interventions/${interventionId}/go`);
  }

  // Notify is now part of /dispatch/interventions/{id}/start
  async notifyTechnicians(interventionId: string): Promise<DispatchResult> {
    return this.dispatchIntervention(interventionId);
  }

  // GET /dispatch/attempts?interventionId=
  async getDispatchAttempts(interventionId: string): Promise<DispatchAttempt[]> {
    return springHttp.get<DispatchAttempt[]>('/dispatch/attempts', { interventionId });
  }

  // GET /dispatch/attempts/current?interventionId=
  async getCurrentAttempt(interventionId: string): Promise<DispatchAttempt | null> {
    return springHttp.get<DispatchAttempt | null>('/dispatch/attempts/current', { interventionId });
  }

  // GET /dispatch/technicians/{technicianId}/pending
  async getTechnicianPendingAssignments(technicianId: string): Promise<DispatchAttempt[]> {
    return springHttp.get<DispatchAttempt[]>(`/dispatch/technicians/${technicianId}/pending`);
  }
}

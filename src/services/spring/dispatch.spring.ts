import type { IDispatchService } from '@/services/interfaces/dispatch.interface';
import type { DispatchResult, DispatchAttempt } from '@/services/supabase/dispatch.service';
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

  /**
   * POST /dispatch/interventions/{id}/manual × N : le contrat n'accepte qu'un
   * seul technicien par appel, la sélection multiple est donc envoyée technicien
   * par technicien et le dernier résultat est renvoyé.
   */
  async dispatchSelected(interventionId: string, technicianIds: string[]): Promise<DispatchResult> {
    if (technicianIds.length === 0) {
      return { success: false, message: 'Aucun technicien sélectionné' };
    }
    let result: DispatchResult = { success: false, message: 'Dispatch manuel non effectué' };
    for (const technicianId of technicianIds) {
      result = await this.manualDispatch(interventionId, technicianId);
    }
    return result;
  }

  /** GET /dispatch/attempts × N : le contrat n'a pas de route « batch ». */
  async getDispatchAttemptsBatch(interventionIds: string[]): Promise<Record<string, DispatchAttempt[]>> {
    const grouped: Record<string, DispatchAttempt[]> = {};
    for (const interventionId of interventionIds) {
      grouped[interventionId] = await this.getDispatchAttempts(interventionId);
    }
    return grouped;
  }

  /**
   * Pas de route « interventions refusées par un technicien » : la liste est
   * dérivée des tentatives de dispatch (refus ou annulation), comme en mode
   * Lovable Cloud.
   */
  async getDeclinedInterventionIds(technicianId: string, interventionIds: string[]): Promise<string[]> {
    if (interventionIds.length === 0) return [];
    const attempts = await this.getDispatchAttemptsBatch(interventionIds);
    return interventionIds.filter((interventionId) =>
      (attempts[interventionId] ?? []).some(
        (attempt) =>
          attempt.technicianId === technicianId &&
          (attempt.status === 'rejected' || attempt.status === 'cancelled'),
      ),
    );
  }
}

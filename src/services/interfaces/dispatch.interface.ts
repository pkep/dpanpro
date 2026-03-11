import type { DispatchResult, DispatchAttempt } from '@/services/supabase/dispatch.service';

export interface IDispatchService {
  dispatchIntervention(interventionId: string): Promise<DispatchResult>;
  acceptAssignment(interventionId: string, technicianId: string): Promise<DispatchResult>;
  rejectAssignment(interventionId: string, technicianId: string): Promise<DispatchResult>;
  declineIntervention(interventionId: string, technicianId: string, reason: string): Promise<DispatchResult>;
  cancelAssignment(interventionId: string, technicianId: string, reason: string): Promise<DispatchResult>;
  goToIntervention(interventionId: string, technicianId: string): Promise<DispatchResult>;
  notifyTechnicians(interventionId: string): Promise<DispatchResult>;
  getDispatchAttempts(interventionId: string): Promise<DispatchAttempt[]>;
  getCurrentAttempt(interventionId: string): Promise<DispatchAttempt | null>;
  getTechnicianPendingAssignments(technicianId: string): Promise<DispatchAttempt[]>;
}

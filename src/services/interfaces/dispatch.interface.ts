export interface DispatchResult {
  success: boolean;
  message: string;
  assignedTechnician?: {
    userId: string;
    score: number;
    distanceKm: number;
    estimatedArrivalMinutes: number;
  };
  timeoutAt?: string;
  totalCandidates?: number;
  requiresManualAssignment?: boolean;
  newTechnicianId?: string;
}

export interface DispatchAttempt {
  id: string;
  interventionId: string;
  technicianId: string;
  technicianFirstName?: string | null;
  technicianLastName?: string | null;
  technicianPhone?: string | null;
  score: number;
  scoreBreakdown: {
    proximity: number;
    skills: number;
    workload: number;
    rating: number;
  };
  status: 'pending' | 'accepted' | 'rejected' | 'timeout' | 'cancelled';
  attemptOrder: number;
  notifiedAt: string | null;
  respondedAt: string | null;
  timeoutAt: string | null;
  createdAt: string;
}

export interface IDispatchService {
  dispatchIntervention(interventionId: string): Promise<DispatchResult>;
  /** Dispatch SMS vers une sélection manuelle de techniciens. */
  dispatchSelected(interventionId: string, technicianIds: string[]): Promise<DispatchResult>;
  acceptAssignment(interventionId: string, technicianId: string): Promise<DispatchResult>;
  rejectAssignment(interventionId: string, technicianId: string): Promise<DispatchResult>;
  declineIntervention(interventionId: string, technicianId: string, reason: string): Promise<DispatchResult>;
  cancelAssignment(interventionId: string, technicianId: string, reason: string): Promise<DispatchResult>;
  goToIntervention(interventionId: string, technicianId: string): Promise<DispatchResult>;
  notifyTechnicians(interventionId: string): Promise<DispatchResult>;
  getDispatchAttempts(interventionId: string): Promise<DispatchAttempt[]>;
  getDispatchAttemptsBatch(interventionIds: string[]): Promise<Record<string, DispatchAttempt[]>>;
  getCurrentAttempt(interventionId: string): Promise<DispatchAttempt | null>;
  getTechnicianPendingAssignments(technicianId: string): Promise<DispatchAttempt[]>;
  getDeclinedInterventionIds(technicianId: string, interventionIds: string[]): Promise<string[]>;
}

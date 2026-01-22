import { supabase } from '@/integrations/supabase/client';

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

class DispatchService {
  /**
   * Dispatch an intervention to the best available technician
   */
  async dispatchIntervention(interventionId: string): Promise<DispatchResult> {
    const { data, error } = await supabase.functions.invoke('dispatch-intervention', {
      body: {
        interventionId,
        action: 'dispatch',
      },
    });

    if (error) throw error;
    return data as DispatchResult;
  }

  /**
   * Accept an intervention assignment (called by technician)
   */
  async acceptAssignment(interventionId: string, technicianId: string): Promise<DispatchResult> {
    const { data, error } = await supabase.functions.invoke('dispatch-intervention', {
      body: {
        interventionId,
        technicianId,
        action: 'accept',
      },
    });

    if (error) throw error;
    return data as DispatchResult;
  }

  /**
   * Reject an intervention assignment (called by technician)
   */
  async rejectAssignment(interventionId: string, technicianId: string): Promise<DispatchResult> {
    const { data, error } = await supabase.functions.invoke('dispatch-intervention', {
      body: {
        interventionId,
        technicianId,
        action: 'reject',
      },
    });

    if (error) throw error;
    return data as DispatchResult;
  }

  /**
   * Decline an intervention with reason (persistent - won't be shown again)
   */
  async declineIntervention(interventionId: string, technicianId: string, reason: string): Promise<DispatchResult> {
    const { data, error } = await supabase.functions.invoke('dispatch-intervention', {
      body: {
        interventionId,
        technicianId,
        action: 'decline',
        reason,
      },
    });

    if (error) throw error;
    return data as DispatchResult;
  }

  /**
   * Cancel an accepted assignment with reason (triggers re-dispatch)
   */
  async cancelAssignment(interventionId: string, technicianId: string, reason: string): Promise<DispatchResult> {
    const { data, error } = await supabase.functions.invoke('dispatch-intervention', {
      body: {
        interventionId,
        technicianId,
        action: 'cancel',
        reason,
      },
    });

    if (error) throw error;
    return data as DispatchResult;
  }

  /**
   * Go directly to intervention (assign + set en_route)
   */
  async goToIntervention(interventionId: string, technicianId: string): Promise<DispatchResult> {
    const { data, error } = await supabase.functions.invoke('dispatch-intervention', {
      body: {
        interventionId,
        technicianId,
        action: 'go',
      },
    });

    if (error) throw error;
    return data as DispatchResult;
  }

  /**
   * Get dispatch attempts for an intervention
   */
  async getDispatchAttempts(interventionId: string): Promise<DispatchAttempt[]> {
    const { data, error } = await supabase
      .from('dispatch_attempts')
      .select('*')
      .eq('intervention_id', interventionId)
      .order('attempt_order', { ascending: true });

    if (error) throw error;

    return (data || []).map(this.mapToDispatchAttempt);
  }

  /**
   * Get current pending attempt for an intervention
   */
  async getCurrentAttempt(interventionId: string): Promise<DispatchAttempt | null> {
    const { data, error } = await supabase
      .from('dispatch_attempts')
      .select('*')
      .eq('intervention_id', interventionId)
      .eq('status', 'pending')
      .not('notified_at', 'is', null)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapToDispatchAttempt(data);
  }

  /**
   * Get pending assignments for a technician
   */
  async getTechnicianPendingAssignments(technicianId: string): Promise<DispatchAttempt[]> {
    const { data, error } = await supabase
      .from('dispatch_attempts')
      .select('*')
      .eq('technician_id', technicianId)
      .eq('status', 'pending')
      .not('notified_at', 'is', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapToDispatchAttempt);
  }

  private mapToDispatchAttempt(data: Record<string, unknown>): DispatchAttempt {
    return {
      id: data.id as string,
      interventionId: data.intervention_id as string,
      technicianId: data.technician_id as string,
      score: data.score as number,
      scoreBreakdown: data.score_breakdown as DispatchAttempt['scoreBreakdown'],
      status: data.status as DispatchAttempt['status'],
      attemptOrder: data.attempt_order as number,
      notifiedAt: data.notified_at as string | null,
      respondedAt: data.responded_at as string | null,
      timeoutAt: data.timeout_at as string | null,
      createdAt: data.created_at as string,
    };
  }
}

export const dispatchService = new DispatchService();

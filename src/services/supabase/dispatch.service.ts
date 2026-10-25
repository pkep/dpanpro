import { supabase } from '@/integrations/supabase/client';
import {IDispatchService} from "@/services/interfaces";

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

class SupabaseDispatchService implements IDispatchService{
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

  async dispatchSelected(interventionId: string, technicianIds: string[]): Promise<DispatchResult> {
    const { data, error } = await supabase.functions.invoke('dispatch-intervention', {
      body: { interventionId, action: 'dispatch_selected', technicianIds },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
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
   * Send notifications to pending technicians (after payment confirmation)
   */
  async notifyTechnicians(interventionId: string): Promise<DispatchResult> {
    const { data, error } = await supabase.functions.invoke('dispatch-intervention', {
      body: {
        interventionId,
        action: 'notify',
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
      .select('*, users!dispatch_attempts_technician_id_fkey(first_name,last_name,phone)')
      .eq('intervention_id', interventionId)
      .order('attempt_order', { ascending: true });

    if (error) throw error;

    return (data || []).map(this.mapToDispatchAttempt);
  }

  async getDispatchAttemptsBatch(interventionIds: string[]): Promise<Record<string, DispatchAttempt[]>> {
    if (interventionIds.length === 0) return {};
    const { data, error } = await supabase
      .from('dispatch_attempts')
      .select('*, users!dispatch_attempts_technician_id_fkey(first_name,last_name,phone)')
      .in('intervention_id', interventionIds)
      .order('attempt_order', { ascending: true });

    if (error) throw error;

    const grouped: Record<string, DispatchAttempt[]> = {};
    for (const id of interventionIds) grouped[id] = [];
    for (const row of (data || []) as Record<string, unknown>[]) {
      const attempt = this.mapToDispatchAttempt(row);
      if (!grouped[attempt.interventionId]) grouped[attempt.interventionId] = [];
      grouped[attempt.interventionId].push(attempt);
    }
    return grouped;
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

  /**
   * Get intervention IDs that were declined/rejected by a technician
   */
  async getDeclinedInterventionIds(technicianId: string, interventionIds: string[]): Promise<string[]> {
    if (interventionIds.length === 0) return [];

    const { data, error } = await supabase
      .from('dispatch_attempts')
      .select('intervention_id')
      .eq('technician_id', technicianId)
      .in('status', ['cancelled', 'rejected'])
      .in('intervention_id', interventionIds);

    if (error) throw error;

    return (data || []).map(a => a.intervention_id as string);
  }

  private mapToDispatchAttempt(data: Record<string, unknown>): DispatchAttempt {
    const users = data.users as Record<string, unknown> | null | undefined;
    return {
      id: data.id as string,
      interventionId: data.intervention_id as string,
      technicianId: data.technician_id as string,
      technicianFirstName: (users?.first_name as string) ?? null,
      technicianLastName: (users?.last_name as string) ?? null,
      technicianPhone: (users?.phone as string) ?? null,
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

export const dispatchService = new SupabaseDispatchService();

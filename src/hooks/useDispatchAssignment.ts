import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dispatchService, DispatchAttempt } from '@/services/dispatch/dispatch.service';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UseDispatchAssignmentReturn {
  pendingAssignment: DispatchAttempt | null;
  isLoading: boolean;
  timeRemaining: number | null;
  acceptAssignment: () => Promise<void>;
  rejectAssignment: () => Promise<void>;
}

export function useDispatchAssignment(interventionId?: string): UseDispatchAssignmentReturn {
  const { user } = useAuth();
  const [pendingAssignment, setPendingAssignment] = useState<DispatchAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Fetch pending assignment
  const fetchPendingAssignment = useCallback(async () => {
    if (!user || user.role !== 'technician') return;

    try {
      let assignment: DispatchAttempt | null = null;

      if (interventionId) {
        // Get specific intervention assignment
        const attempts = await dispatchService.getDispatchAttempts(interventionId);
        assignment = attempts.find(
          a => a.technicianId === user.id && a.status === 'pending' && a.notifiedAt
        ) || null;
      } else {
        // Get any pending assignment for this technician
        const assignments = await dispatchService.getTechnicianPendingAssignments(user.id);
        assignment = assignments[0] || null;
      }

      setPendingAssignment(assignment);
    } catch (error) {
      console.error('Error fetching pending assignment:', error);
    }
  }, [user, interventionId]);

  // Initial fetch
  useEffect(() => {
    fetchPendingAssignment();
  }, [fetchPendingAssignment]);

  // Real-time updates
  useEffect(() => {
    if (!user || user.role !== 'technician') return;

    const channel = supabase
      .channel('dispatch-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dispatch_attempts',
          filter: `technician_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Dispatch attempt update:', payload);
          fetchPendingAssignment();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPendingAssignment]);

  // Countdown timer
  useEffect(() => {
    if (!pendingAssignment?.timeoutAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const timeout = new Date(pendingAssignment.timeoutAt!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((timeout - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Timeout reached, refetch
        fetchPendingAssignment();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [pendingAssignment?.timeoutAt, fetchPendingAssignment]);

  const acceptAssignment = useCallback(async () => {
    if (!pendingAssignment || !user) return;

    setIsLoading(true);
    try {
      const result = await dispatchService.acceptAssignment(
        pendingAssignment.interventionId,
        user.id
      );

      if (result.success) {
        toast.success('Mission acceptée !', {
          description: 'Vous êtes maintenant en route vers le client.',
        });
        setPendingAssignment(null);
      } else {
        toast.error('Erreur', { description: result.message });
      }
    } catch (error) {
      console.error('Error accepting assignment:', error);
      toast.error('Erreur lors de l\'acceptation');
    } finally {
      setIsLoading(false);
    }
  }, [pendingAssignment, user]);

  const rejectAssignment = useCallback(async () => {
    if (!pendingAssignment || !user) return;

    setIsLoading(true);
    try {
      const result = await dispatchService.rejectAssignment(
        pendingAssignment.interventionId,
        user.id
      );

      if (result.success) {
        toast.info('Mission refusée', {
          description: 'L\'intervention sera proposée à un autre artisan.',
        });
        setPendingAssignment(null);
      } else {
        toast.error('Erreur', { description: result.message });
      }
    } catch (error) {
      console.error('Error rejecting assignment:', error);
      toast.error('Erreur lors du refus');
    } finally {
      setIsLoading(false);
    }
  }, [pendingAssignment, user]);

  return {
    pendingAssignment,
    isLoading,
    timeRemaining,
    acceptAssignment,
    rejectAssignment,
  };
}

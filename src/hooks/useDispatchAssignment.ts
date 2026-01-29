import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dispatchService, DispatchAttempt } from '@/services/dispatch/dispatch.service';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getRouteWithFallback, RouteResult } from '@/services/routing/routing.service';

interface TravelInfo {
  distanceKm: number;
  distanceFormatted: string;
  estimatedMinutes: number;
}

interface InterventionLocation {
  latitude: number | null;
  longitude: number | null;
}

interface TechnicianLocation {
  latitude: number | null;
  longitude: number | null;
}

interface UseDispatchAssignmentReturn {
  pendingAssignment: DispatchAttempt | null;
  isLoading: boolean;
  timeRemaining: number | null;
  travelInfo: TravelInfo | null;
  acceptAssignment: () => Promise<string | null>;
  rejectAssignment: () => Promise<void>;
}

export function useDispatchAssignment(interventionId?: string): UseDispatchAssignmentReturn {
  const { user } = useAuth();
  const [pendingAssignment, setPendingAssignment] = useState<DispatchAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [interventionLocation, setInterventionLocation] = useState<InterventionLocation | null>(null);
  const [technicianLocation, setTechnicianLocation] = useState<TechnicianLocation | null>(null);

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

      // Fetch intervention location if we have an assignment
      if (assignment) {
        const { data: intervention } = await supabase
          .from('interventions')
          .select('latitude, longitude')
          .eq('id', assignment.interventionId)
          .single();

        if (intervention) {
          setInterventionLocation({
            latitude: intervention.latitude,
            longitude: intervention.longitude,
          });
        }

        // Fetch technician's current location
        const { data: techApp } = await supabase
          .from('partner_applications')
          .select('latitude, longitude')
          .eq('user_id', user.id)
          .single();

        if (techApp) {
          setTechnicianLocation({
            latitude: techApp.latitude,
            longitude: techApp.longitude,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching pending assignment:', error);
    }
  }, [user, interventionId]);

  // Calculate travel info using IGN API
  const [travelInfo, setTravelInfo] = useState<TravelInfo | null>(null);
  const [isCalculatingTravel, setIsCalculatingTravel] = useState(false);

  const calculateTravelInfo = useCallback(async () => {
    if (!technicianLocation?.latitude || !technicianLocation?.longitude ||
        !interventionLocation?.latitude || !interventionLocation?.longitude) {
      setTravelInfo(null);
      return;
    }

    setIsCalculatingTravel(true);
    try {
      const result = await getRouteWithFallback(
        technicianLocation.latitude,
        technicianLocation.longitude,
        interventionLocation.latitude,
        interventionLocation.longitude
      );

      // Add 5 minutes base departure time
      const BASE_DEPARTURE_MINUTES = 5;
      const estimatedMinutes = BASE_DEPARTURE_MINUTES + result.durationMinutes;

      setTravelInfo({
        distanceKm: result.distanceKm,
        distanceFormatted: `${result.distanceKm} km`,
        estimatedMinutes,
      });
    } catch (error) {
      console.error('Error calculating travel info:', error);
      setTravelInfo(null);
    } finally {
      setIsCalculatingTravel(false);
    }
  }, [technicianLocation, interventionLocation]);

  // Recalculate when locations change
  useEffect(() => {
    calculateTravelInfo();
  }, [calculateTravelInfo]);

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

  // Update technician location when it changes
  useEffect(() => {
    if (!user || user.role !== 'technician' || !pendingAssignment) return;

    const channel = supabase
      .channel('technician-location-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'partner_applications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData.latitude && newData.longitude) {
            setTechnicianLocation({
              latitude: newData.latitude,
              longitude: newData.longitude,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, pendingAssignment]);

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

  const acceptAssignment = useCallback(async (): Promise<string | null> => {
    if (!pendingAssignment || !user) return null;

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
        const acceptedInterventionId = pendingAssignment.interventionId;
        setPendingAssignment(null);
        return acceptedInterventionId;
      } else {
        toast.error('Erreur', { description: result.message });
        return null;
      }
    } catch (error) {
      console.error('Error accepting assignment:', error);
      toast.error('Erreur lors de l\'acceptation');
      return null;
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
    travelInfo,
    acceptAssignment,
    rejectAssignment,
  };
}

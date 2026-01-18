import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { interventionsService } from '@/services/interventions/interventions.service';
import type { Intervention } from '@/types/intervention.types';

export function useRealtimeIntervention(interventionId: string | undefined) {
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntervention = useCallback(async () => {
    if (!interventionId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await interventionsService.getIntervention(interventionId);
      setIntervention(data);
    } catch (err) {
      setError('Erreur lors du chargement de l\'intervention');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [interventionId]);

  useEffect(() => {
    fetchIntervention();
  }, [fetchIntervention]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!interventionId) return;

    console.log('Setting up realtime subscription for intervention:', interventionId);

    const channel = supabase
      .channel(`intervention-${interventionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interventions',
          filter: `id=eq.${interventionId}`,
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          // Refresh the intervention data
          fetchIntervention();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [interventionId, fetchIntervention]);

  return { intervention, loading, error, refresh: fetchIntervention };
}

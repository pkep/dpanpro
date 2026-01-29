import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TechnicianPosition {
  latitude: number;
  longitude: number;
  firstName: string;
  lastName: string;
  updatedAt: Date;
}

export function useTechnicianRealtimePosition(technicianId: string | null) {
  const [position, setPosition] = useState<TechnicianPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial position
  const fetchPosition = useCallback(async () => {
    if (!technicianId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch technician location from partner_applications
      const { data: application, error: appError } = await supabase
        .from('partner_applications')
        .select('latitude, longitude, user_id')
        .eq('user_id', technicianId)
        .single();

      if (appError) throw appError;

      if (application?.latitude && application?.longitude) {
        // Get technician name
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', technicianId)
          .single();

        if (userError) throw userError;

        setPosition({
          latitude: application.latitude,
          longitude: application.longitude,
          firstName: userData?.first_name || 'Technicien',
          lastName: userData?.last_name || '',
          updatedAt: new Date(),
        });
      }
    } catch (err) {
      console.error('Error fetching technician position:', err);
      setError('Impossible de récupérer la position du technicien');
    } finally {
      setLoading(false);
    }
  }, [technicianId]);

  // Initial fetch
  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!technicianId) return;

    const channel = supabase
      .channel(`technician-realtime-${technicianId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'partner_applications',
          filter: `user_id=eq.${technicianId}`,
        },
        async (payload) => {
          const newData = payload.new as { latitude?: number; longitude?: number };
          if (newData.latitude && newData.longitude) {
            // Keep existing name or fetch if needed
            setPosition((prev) => ({
              latitude: newData.latitude!,
              longitude: newData.longitude!,
              firstName: prev?.firstName || 'Technicien',
              lastName: prev?.lastName || '',
              updatedAt: new Date(),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [technicianId]);

  return { position, loading, error, refetch: fetchPosition };
}

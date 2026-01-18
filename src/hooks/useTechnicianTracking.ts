import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface TechnicianLocation {
  id: string;
  firstName: string;
  lastName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  updatedAt: string;
  status: 'available' | 'busy' | 'en_route';
}

interface PresenceState {
  [key: string]: TechnicianLocation[];
}

export function useTechnicianTracking(enableTracking: boolean = false) {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState<TechnicianLocation[]>([]);
  const [myLocation, setMyLocation] = useState<GeolocationPosition | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Start/stop geolocation watching
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setTrackingError('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setIsTracking(true);
    setTrackingError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setMyLocation(position);
        setTrackingError(null);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setTrackingError('Accès à la géolocalisation refusé');
            break;
          case error.POSITION_UNAVAILABLE:
            setTrackingError('Position non disponible');
            break;
          case error.TIMEOUT:
            setTrackingError('Délai de géolocalisation dépassé');
            break;
          default:
            setTrackingError('Erreur de géolocalisation');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Setup Supabase Presence channel
  useEffect(() => {
    const channel = supabase.channel('technicians-location', {
      config: {
        presence: {
          key: user?.id || 'anonymous',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state: PresenceState = channel.presenceState();
        const allTechnicians: TechnicianLocation[] = [];
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            if (presence.latitude && presence.longitude) {
              allTechnicians.push(presence);
            }
          });
        });
        
        setTechnicians(allTechnicians);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Technician joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Technician left:', leftPresences);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Track position when enabled and user is a technician
  useEffect(() => {
    if (enableTracking && user?.role === 'technician') {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enableTracking, user?.role, startTracking, stopTracking]);

  // Share position via Presence
  useEffect(() => {
    if (!myLocation || !user || !channelRef.current || !enableTracking) return;

    const locationData: TechnicianLocation = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      latitude: myLocation.coords.latitude,
      longitude: myLocation.coords.longitude,
      accuracy: myLocation.coords.accuracy,
      heading: myLocation.coords.heading,
      speed: myLocation.coords.speed,
      updatedAt: new Date().toISOString(),
      status: 'available',
    };

    channelRef.current.track(locationData);
  }, [myLocation, user, enableTracking]);

  return {
    technicians,
    myLocation,
    trackingError,
    isTracking,
    startTracking,
    stopTracking,
  };
}

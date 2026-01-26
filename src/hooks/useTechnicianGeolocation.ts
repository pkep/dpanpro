import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { techniciansService } from '@/services/technicians/technicians.service';
import { geocodingService } from '@/services/geocoding/geocoding.service';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  department: string | null;
  isTracking: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const TRACKING_INTERVAL_MS = 30000; // 30 seconds

// GPS tracking - enabled for real-time technician location updates
const GPS_TRACKING_ENABLED = true;

export function useTechnicianGeolocation() {
  const { user } = useAuth();
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    city: null,
    department: null,
    isTracking: false,
    error: null,
    lastUpdated: null,
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTracking = GPS_TRACKING_ENABLED && user?.role === 'technician' && user?.isActive;

  const updateLocation = useCallback(async () => {
    if (!user || user.role !== 'technician') return;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      // Use detailed reverse geocoding to get properly structured city and department
      const addressInfo = await geocodingService.reverseGeocodeDetailed(latitude, longitude);
      
      const city = addressInfo?.city || null;
      const department = addressInfo?.department || null;

      console.log('Geolocation update:', { latitude, longitude, city, department, addressInfo });

      // Update database
      await techniciansService.updateTechnicianLocation(
        user.id,
        latitude,
        longitude,
        city,
        department
      );

      setState(prev => ({
        ...prev,
        latitude,
        longitude,
        city,
        department,
        isTracking: true,
        error: null,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      const errorMessage = error instanceof GeolocationPositionError
        ? getGeolocationErrorMessage(error)
        : 'Erreur lors de la mise à jour de la position';

      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      console.error('Geolocation error:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!isTracking) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial location update
    updateLocation();

    // Set up interval for periodic updates
    intervalRef.current = setInterval(updateLocation, TRACKING_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTracking, updateLocation]);

  return state;
}

function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Accès à la géolocalisation refusé';
    case error.POSITION_UNAVAILABLE:
      return 'Position non disponible';
    case error.TIMEOUT:
      return 'Délai de géolocalisation dépassé';
    default:
      return 'Erreur de géolocalisation';
  }
}

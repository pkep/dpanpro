import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { interventionsService } from '@/services/interventions/interventions.service';
import { geocodingService } from '@/services/geocoding/geocoding.service';
import { calculateDistance, formatDistance } from '@/utils/geolocation';
import type { Intervention } from '@/types/intervention.types';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/intervention.types';
import { toast } from 'sonner';

interface ProximityNotification {
  interventionId: string;
  distance: number;
  notifiedAt: Date;
}

interface UseProximityNotificationsOptions {
  enabled?: boolean;
  thresholdMeters?: number;
  cooldownMinutes?: number;
}

export function useProximityNotifications({
  enabled = false,
  thresholdMeters = 500,
  cooldownMinutes = 15,
}: UseProximityNotificationsOptions = {}) {
  const { user } = useAuth();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isWatching, setIsWatching] = useState(false);
  const notificationHistory = useRef<Map<string, ProximityNotification>>(new Map());
  const watchIdRef = useRef<number | null>(null);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    }

    setNotificationPermission('denied');
    return false;
  }, []);

  // Send push notification
  const sendNotification = useCallback((intervention: Intervention, distance: number) => {
    const title = `📍 Intervention proche !`;
    const body = `${CATEGORY_ICONS[intervention.category]} ${intervention.title}\n${intervention.address}, ${intervention.city}\nÀ ${formatDistance(distance)}`;
    
    // Browser notification
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: `proximity-${intervention.id}`,
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = `/intervention/${intervention.id}`;
        notification.close();
      };

      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    }

    // Also show toast notification
    toast.info(title, {
      description: `${CATEGORY_ICONS[intervention.category]} ${intervention.title} - À ${formatDistance(distance)}`,
      action: {
        label: 'Voir',
        onClick: () => {
          window.location.href = `/intervention/${intervention.id}`;
        },
      },
      duration: 8000,
    });
  }, []);

  // Check if we should send a notification (cooldown logic)
  const shouldNotify = useCallback((interventionId: string) => {
    const lastNotification = notificationHistory.current.get(interventionId);
    
    if (!lastNotification) return true;
    
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const timeSinceLastNotification = Date.now() - lastNotification.notifiedAt.getTime();
    
    return timeSinceLastNotification >= cooldownMs;
  }, [cooldownMinutes]);

  // Record notification
  const recordNotification = useCallback((interventionId: string, distance: number) => {
    notificationHistory.current.set(interventionId, {
      interventionId,
      distance,
      notifiedAt: new Date(),
    });
  }, []);

  // Fetch assigned interventions
  useEffect(() => {
    if (!enabled || !user || user.role !== 'technician') return;

    const fetchInterventions = async () => {
      try {
        const data = await interventionsService.getInterventions({
          technicianId: user.id,
          isActive: true,
        });
        
        // Filter to only active, non-completed interventions
        const activeInterventions = data.filter(i => 
          ['assigned', 'en_route', 'in_progress'].includes(i.status)
        );
        
        setInterventions(activeInterventions);
      } catch (error) {
        console.error('Error fetching interventions for proximity:', error);
      }
    };

    fetchInterventions();
    // Refresh every 2 minutes
    const interval = setInterval(fetchInterventions, 120000);
    
    return () => clearInterval(interval);
  }, [enabled, user]);

  // Geocode interventions without coordinates
  useEffect(() => {
    const geocodeInterventions = async () => {
      const toGeocode = interventions.filter(i => !i.latitude || !i.longitude);
      
      for (const intervention of toGeocode) {
        const result = await geocodingService.geocodeAddress(
          intervention.address,
          intervention.city,
          intervention.postalCode
        );

        if (result) {
          setInterventions(prev => 
            prev.map(i => 
              i.id === intervention.id 
                ? { ...i, latitude: result.latitude, longitude: result.longitude }
                : i
            )
          );
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
    };

    if (interventions.length > 0) {
      geocodeInterventions();
    }
  }, [interventions.length]);

  // Start watching position
  useEffect(() => {
    if (!enabled || !user || user.role !== 'technician') {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsWatching(false);
      return;
    }

    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    // Request notification permission
    requestPermission();

    setIsWatching(true);
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentPosition(position);
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsWatching(false);
    };
  }, [enabled, user, requestPermission]);

  // Check proximity and send notifications
  useEffect(() => {
    if (!currentPosition || interventions.length === 0) return;

    const { latitude: userLat, longitude: userLon } = currentPosition.coords;

    interventions.forEach((intervention) => {
      if (!intervention.latitude || !intervention.longitude) return;

      const distance = calculateDistance(
        userLat,
        userLon,
        intervention.latitude,
        intervention.longitude
      );

      if (distance <= thresholdMeters && shouldNotify(intervention.id)) {
        console.log(`Proximity alert: ${intervention.title} at ${formatDistance(distance)}`);
        sendNotification(intervention, distance);
        recordNotification(intervention.id, distance);
      }
    });
  }, [currentPosition, interventions, thresholdMeters, shouldNotify, sendNotification, recordNotification]);

  return {
    isWatching,
    notificationPermission,
    requestPermission,
    currentPosition,
    interventionsCount: interventions.length,
  };
}

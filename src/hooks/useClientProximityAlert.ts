import { useEffect, useRef, useCallback, useState } from 'react';
import { calculateDistance, formatDistance } from '@/utils/geolocation';
import { toast } from 'sonner';

interface UseClientProximityAlertOptions {
  technicianPosition: { latitude: number; longitude: number } | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  thresholdMeters?: number;
  cooldownMinutes?: number;
  technicianName?: string;
}

export function useClientProximityAlert({
  technicianPosition,
  destinationLatitude,
  destinationLongitude,
  thresholdMeters = 500,
  cooldownMinutes = 5,
  technicianName = 'Le technicien',
}: UseClientProximityAlertOptions) {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const lastNotificationTime = useRef<Date | null>(null);
  const hasNotifiedRef = useRef(false);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
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

  // Send proximity notification
  const sendProximityNotification = useCallback((distance: number) => {
    const title = '🚗 Le technicien arrive !';
    const body = `${technicianName} est à ${formatDistance(distance)} de votre adresse.`;

    // Browser notification
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: 'technician-proximity',
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    }

    // Also show toast
    toast.success(title, {
      description: body,
      duration: 8000,
    });

    lastNotificationTime.current = new Date();
    hasNotifiedRef.current = true;
  }, [technicianName]);

  // Check if we should notify (cooldown logic)
  const shouldNotify = useCallback(() => {
    if (!lastNotificationTime.current) return true;

    const cooldownMs = cooldownMinutes * 60 * 1000;
    const timeSinceLastNotification = Date.now() - lastNotificationTime.current.getTime();

    return timeSinceLastNotification >= cooldownMs;
  }, [cooldownMinutes]);

  // Monitor distance and trigger notification
  useEffect(() => {
    if (!technicianPosition || !destinationLatitude || !destinationLongitude) {
      return;
    }

    const distance = calculateDistance(
      technicianPosition.latitude,
      technicianPosition.longitude,
      destinationLatitude,
      destinationLongitude
    );

    // Check if within threshold and should notify
    if (distance <= thresholdMeters && shouldNotify()) {
      console.log(`[ProximityAlert] Technician within ${formatDistance(distance)} - sending notification`);
      sendProximityNotification(distance);
    }

    // Reset hasNotified when technician moves away (for re-notification on next approach)
    if (distance > thresholdMeters * 1.5) {
      hasNotifiedRef.current = false;
    }
  }, [
    technicianPosition,
    destinationLatitude,
    destinationLongitude,
    thresholdMeters,
    shouldNotify,
    sendProximityNotification,
  ]);

  return {
    notificationPermission,
    requestPermission,
    hasNotified: hasNotifiedRef.current,
  };
}

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CATEGORY_LABELS } from '@/types/intervention.types';

interface Notification {
  id: string;
  type: 'assignment' | 'status_change' | 'new_intervention';
  title: string;
  message: string;
  interventionId: string;
  createdAt: string;
  read: boolean;
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousTechnicianIds = useRef<Map<string, string | null>>(new Map());

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    setUnreadCount((prev) => prev + 1);

    // Show toast notification
    toast.info(notification.title, {
      description: notification.message,
      action: {
        label: 'Voir',
        onClick: () => {
          window.location.href = `/intervention/${notification.interventionId}`;
        },
      },
    });
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!user) return;

    const isTechnician = user.role === 'technician' || user.role === 'admin';
    if (!isTechnician) return;

    console.log('Setting up realtime notifications for user:', user.id);

    const channel = supabase
      .channel('technician-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interventions',
        },
        (payload) => {
          console.log('Intervention update received:', payload);
          
          const newData = payload.new as any;
          const oldData = payload.old as any;

          // Check if technician was just assigned (technician_id changed to current user)
          if (
            newData.technician_id === user.id &&
            oldData.technician_id !== user.id
          ) {
            const categoryLabel = CATEGORY_LABELS[newData.category as keyof typeof CATEGORY_LABELS] || newData.category;
            
            addNotification({
              type: 'assignment',
              title: '🔔 Nouvelle intervention assignée',
              message: `${categoryLabel}: ${newData.title} - ${newData.city}`,
              interventionId: newData.id,
            });
          }

          // Check if status changed for an intervention assigned to this technician
          if (
            newData.technician_id === user.id &&
            oldData.status !== newData.status &&
            oldData.technician_id === user.id
          ) {
            // Only notify for certain status changes
            if (newData.status === 'cancelled') {
              addNotification({
                type: 'status_change',
                title: '❌ Intervention annulée',
                message: `L'intervention "${newData.title}" a été annulée`,
                interventionId: newData.id,
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interventions',
        },
        (payload) => {
          console.log('New intervention created:', payload);
          
          const newData = payload.new as any;

          // If intervention is directly assigned to this technician on creation
          if (newData.technician_id === user.id) {
            const categoryLabel = CATEGORY_LABELS[newData.category as keyof typeof CATEGORY_LABELS] || newData.category;
            
            addNotification({
              type: 'assignment',
              title: '🔔 Nouvelle intervention assignée',
              message: `${categoryLabel}: ${newData.title} - ${newData.city}`,
              interventionId: newData.id,
            });
          }

          // Notify admins of new interventions (urgent ones)
          if (user.role === 'admin' && newData.priority === 'urgent') {
            addNotification({
              type: 'new_intervention',
              title: '🚨 Intervention urgente',
              message: `Nouvelle demande urgente: ${newData.title}`,
              interventionId: newData.id,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Notifications subscription status:', status);
      });

    return () => {
      console.log('Cleaning up notifications subscription');
      supabase.removeChannel(channel);
    };
  }, [user, addNotification]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}

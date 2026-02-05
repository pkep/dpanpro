import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'new_message' | 'new_photo' | 'client_cancellation' | 'new_intervention' | 'quote_modification' | 'status_change' | 'assignment';
  title: string;
  message: string;
  interventionId: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);

    // Determine the navigation URL based on role and action URL
    const navigateUrl = notification.actionUrl || `/intervention/${notification.interventionId}`;

    toast.info(notification.title, {
      description: notification.message,
      action: {
        label: 'Voir',
        onClick: () => {
          window.location.href = navigateUrl;
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
    const isClient = user.role === 'client';

    // Exit if neither technician/admin nor client
    if (!isTechnician && !isClient) return;

    console.log('Setting up notifications for user:', user.id, 'role:', user.role);

    // Listen for new messages from clients
    const messagesChannel = supabase
      .channel('technician-messages-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'intervention_messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Only notify if message is from a client (not from the technician themselves)
          if (newMessage.sender_role === 'client') {
            // Check if this intervention belongs to this technician
            const { data: intervention } = await supabase
              .from('interventions')
              .select('id, title, technician_id')
              .eq('id', newMessage.intervention_id)
              .single();

            if (intervention && intervention.technician_id === user.id) {
              addNotification({
                type: 'new_message',
                title: '💬 Nouveau message client',
                message: `Le client a envoyé un message`,
                interventionId: newMessage.intervention_id,
              });
            }
          }
        }
      )
      .subscribe();

    // Listen for intervention updates (photos added by client, cancellation by client)
    const interventionsChannel = supabase
      .channel('technician-interventions-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interventions',
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;

          // Only process if this intervention is assigned to the current technician
          if (newData.technician_id !== user.id) return;

          // Check if photos were added (client added new photos)
          const oldPhotos = oldData.photos || [];
          const newPhotos = newData.photos || [];
          
          if (newPhotos.length > oldPhotos.length) {
            addNotification({
              type: 'new_photo',
              title: '📷 Nouvelle photo ajoutée',
              message: `Le client a ajouté ${newPhotos.length - oldPhotos.length} photo(s)`,
              interventionId: newData.id,
            });
          }

          // Check if intervention was cancelled by client
          if (oldData.status !== 'cancelled' && newData.status === 'cancelled') {
            addNotification({
              type: 'client_cancellation',
              title: '❌ Intervention annulée',
              message: `Le client a annulé l'intervention "${newData.title}"`,
              interventionId: newData.id,
            });
          }
        }
      )
      .subscribe();

    // Listen for new urgent interventions (for admins)
    let urgentChannel: ReturnType<typeof supabase.channel> | null = null;
    
    if (user.role === 'admin') {
      urgentChannel = supabase
        .channel('admin-urgent-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'interventions',
          },
          (payload) => {
            const newData = payload.new as any;
            
            if (newData.priority === 'urgent') {
              addNotification({
                type: 'new_intervention',
                title: '🚨 Intervention urgente',
                message: `Nouvelle demande urgente: ${newData.title}`,
                interventionId: newData.id,
              });
            }
          }
        )
        .subscribe();
    }

    // Listen for quote modifications (for clients)
    let quoteModificationChannel: ReturnType<typeof supabase.channel> | null = null;
    
    if (isClient) {
      quoteModificationChannel = supabase
        .channel('client-quote-modifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'quote_modifications',
          },
          async (payload) => {
            const newMod = payload.new as any;
            
            // Check if this intervention belongs to the current client
            const { data: intervention } = await supabase
              .from('interventions')
              .select('id, title, client_id')
              .eq('id', newMod.intervention_id)
              .single();

            if (intervention && intervention.client_id === user.id && newMod.status === 'pending') {
              addNotification({
                type: 'quote_modification',
                title: '📋 Devis en attente',
                message: `Le technicien propose des prestations supplémentaires (${newMod.total_additional_amount?.toFixed(2) || '0.00'} €)`,
                interventionId: newMod.intervention_id,
                actionUrl: newMod.notification_token ? `/quote-approval/${newMod.notification_token}` : undefined,
              });
            }
          }
        )
        .subscribe();
    }

    return () => {
      console.log('Cleaning up notifications');
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(interventionsChannel);
      if (urgentChannel) {
        supabase.removeChannel(urgentChannel);
      }
      if (quoteModificationChannel) {
        supabase.removeChannel(quoteModificationChannel);
      }
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

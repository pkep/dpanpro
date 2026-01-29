import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  token: string | null;
  error: string | null;
  isLoading: boolean;
}

// Store FCM token in database for push notifications
async function saveFcmToken(
  userId: string | null, 
  email: string | null, 
  token: string
): Promise<void> {
  try {
    // Check if token already exists
    const { data: existingTokens } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, email')
      .eq('fcm_token', token);
    
    if (existingTokens && existingTokens.length > 0) {
      // Update existing token (might have new user_id or email)
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          user_id: userId || existingTokens[0].user_id || undefined,
          email: email || existingTokens[0].email || undefined,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('fcm_token', token);
      
      if (error) throw error;
      console.log('FCM token updated in database');
    } else {
      // Insert new token - need at least email or user_id
      if (!userId && !email) {
        console.log('No user_id or email provided, cannot save token');
        return;
      }
      
      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          fcm_token: token,
          is_active: true,
          user_id: userId || undefined,
          email: email || undefined,
        });
      
      if (error) throw error;
      console.log('FCM token saved to database');
    }
    
    // Also save locally for quick access
    localStorage.setItem('fcm_token', token);
  } catch (err) {
    console.error('Error saving FCM token:', err);
  }
}

// Register push subscription for guest users (by email)
export async function registerGuestPushSubscription(
  email: string,
  token?: string
): Promise<void> {
  const fcmToken = token || localStorage.getItem('fcm_token');
  if (!fcmToken || !email) return;
  
  await saveFcmToken(null, email, fcmToken);
}

export function useFirebaseMessaging() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'unsupported',
    token: null,
    error: null,
    isLoading: true,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      // Basic API support check
      const isSupported = 'Notification' in window;
      
      if (!isSupported) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          permission: 'unsupported',
          isLoading: false,
        }));
        return;
      }

      // Get actual permission status from Notification API
      const currentPermission = Notification.permission;
      
      setState(prev => ({
        ...prev,
        isSupported: true,
        permission: currentPermission,
        isLoading: false,
      }));
    };
    
    checkSupport();
  }, []);

  // Request notification permission and generate token
  const requestPermission = useCallback(async (guestEmail?: string): Promise<boolean> => {
    if (!state.isSupported) {
      toast.error('Les notifications push ne sont pas supportées par votre navigateur');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission === 'granted') {
        // Generate a unique browser token for push notifications
        const browserToken = `browser_${crypto.randomUUID()}`;
        setState(prev => ({ ...prev, token: browserToken }));
        
        // Save token to database
        await saveFcmToken(
          user?.id || null,
          guestEmail || user?.email || null,
          browserToken
        );
        
        toast.success('Notifications activées !');
        return true;
      } else if (permission === 'denied') {
        toast.error('Notifications refusées. Vous pouvez les réactiver dans les paramètres de votre navigateur.');
        return false;
      }
      
      return false;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setState(prev => ({ ...prev, error: 'Erreur lors de la demande de permission' }));
      return false;
    }
  }, [state.isSupported, user]);

  // Send a local notification (fallback when FCM isn't configured)
  const sendLocalNotification = useCallback((title: string, body: string, options?: NotificationOptions) => {
    if (state.permission !== 'granted') {
      console.log('Notifications not granted, skipping:', title);
      return;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'intervention-update',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  }, [state.permission]);

  // Subscribe to intervention status changes for the current user
  useEffect(() => {
    if (!user || state.permission !== 'granted') return;

    const channel = supabase
      .channel('intervention-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interventions',
          filter: `client_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;

          // Only notify on status changes
          if (newData.status !== oldData.status) {
            const statusMessages: Record<string, { title: string; body: string }> = {
              assigned: {
                title: '👷 Technicien assigné',
                body: 'Un technicien a été assigné à votre intervention',
              },
              on_route: {
                title: '🚗 Technicien en route',
                body: 'Le technicien est en route vers votre adresse',
              },
              in_progress: {
                title: '🔧 Intervention en cours',
                body: 'Le technicien a commencé l\'intervention',
              },
              completed: {
                title: '✅ Intervention terminée',
                body: 'L\'intervention a été effectuée avec succès',
              },
              cancelled: {
                title: '❌ Intervention annulée',
                body: 'L\'intervention a été annulée',
              },
            };

            const message = statusMessages[newData.status];
            if (message) {
              sendLocalNotification(message.title, message.body, {
                data: { interventionId: newData.id },
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, state.permission, sendLocalNotification]);

  // Subscribe to quote modification notifications for clients
  useEffect(() => {
    if (!user || state.permission !== 'granted') return;

    const channel = supabase
      .channel('quote-modification-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quote_modifications',
        },
        async (payload) => {
          const newMod = payload.new as any;
          
          // Fetch intervention to check if this user is the client
          const { data: intervention } = await supabase
            .from('interventions')
            .select('client_id, title')
            .eq('id', newMod.intervention_id)
            .single();

          if (intervention && intervention.client_id === user.id) {
            sendLocalNotification(
              '📋 Modification de devis',
              `Le technicien propose ${Number(newMod.total_additional_amount).toFixed(2)}€ de prestations supplémentaires`,
              {
                data: { interventionId: newMod.intervention_id },
                requireInteraction: true,
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, state.permission, sendLocalNotification]);

  return {
    ...state,
    requestPermission,
    sendLocalNotification,
  };
}

// Hook for technicians to receive assignment notifications
export function useTechnicianPushNotifications() {
  const { user } = useAuth();
  const { permission, sendLocalNotification, requestPermission, isSupported } = useFirebaseMessaging();

  useEffect(() => {
    if (!user || user.role !== 'technician' || permission !== 'granted') return;

    const channel = supabase
      .channel('technician-push-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dispatch_attempts',
          filter: `technician_id=eq.${user.id}`,
        },
        async (payload) => {
          const attempt = payload.new as any;
          
          // Fetch intervention details
          const { data: intervention } = await supabase
            .from('interventions')
            .select('title, address, city, priority, category')
            .eq('id', attempt.intervention_id)
            .single();

          if (intervention) {
            const priorityEmoji = intervention.priority === 'urgent' ? '🚨' : 
                                  intervention.priority === 'high' ? '⚠️' : '📋';
            
            sendLocalNotification(
              `${priorityEmoji} Nouvelle mission disponible`,
              `${intervention.title}\n${intervention.address}, ${intervention.city}`,
              {
                data: { interventionId: attempt.intervention_id },
                requireInteraction: true,
              }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interventions',
          filter: `technician_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;

          if (newData.status !== oldData.status) {
            const messages: Record<string, { title: string; body: string }> = {
              cancelled: {
                title: '❌ Mission annulée',
                body: `La mission "${newData.title}" a été annulée`,
              },
            };

            const message = messages[newData.status];
            if (message) {
              sendLocalNotification(message.title, message.body);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, permission, sendLocalNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
  };
}

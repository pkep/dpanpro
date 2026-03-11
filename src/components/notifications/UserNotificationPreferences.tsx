import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Bell, Smartphone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const EVENT_LABELS: Record<string, string> = {
  dispatch_assignment: 'Dispatch',
  status_change: 'Changement de statut',
  new_intervention: 'Nouvelle intervention',
  quote_modification: 'Modification de devis',
  new_message: 'Nouveau message',
  payment_required: 'Paiement requis',
  payment_authorized: 'Paiement autorisé',
  arrival_reminder: 'Rappel d\'arrivée',
  payout_notification: 'Versement',
  client_cancellation: 'Annulation',
};

const CHANNEL_ICONS: Record<string, { icon: typeof Bell; label: string }> = {
  push: { icon: Bell, label: 'Push' },
  sms: { icon: Smartphone, label: 'SMS' },
  email: { icon: Mail, label: 'Email' },
};

interface NotificationSetting {
  id: string;
  event_type: string;
  channel: string;
  is_enabled: boolean;
  applicable_roles: string[];
}

interface UserPreference {
  id: string;
  user_id: string;
  event_type: string;
  channel: string;
  is_enabled: boolean;
}

export function UserNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userRole = user?.role || 'client';

  // Fetch global settings
  const { data: globalSettings, isLoading: loadingGlobal } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_settings').select('*');
      if (error) throw error;
      return data as NotificationSetting[];
    },
  });

  // Fetch user preferences
  const { data: userPrefs, isLoading: loadingPrefs } = useQuery({
    queryKey: ['user-notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as UserPreference[];
    },
    enabled: !!user?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ event_type, channel, is_enabled }: { event_type: string; channel: string; is_enabled: boolean }) => {
      if (!user?.id) throw new Error('Non connecté');
      const existing = userPrefs?.find(p => p.event_type === event_type && p.channel === channel);
      if (existing) {
        const { error } = await supabase
          .from('user_notification_preferences')
          .update({ is_enabled })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_notification_preferences')
          .insert({ user_id: user.id, event_type, channel, is_enabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notification-preferences', user?.id] });
      toast.success('Préférence mise à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  if (loadingGlobal || loadingPrefs) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  // Filter settings applicable to the user's role
  const applicableSettings = globalSettings?.filter(
    s => s.is_enabled && s.applicable_roles.includes(userRole)
  ) || [];

  // Group by event type
  const byEvent: Record<string, NotificationSetting[]> = {};
  applicableSettings.forEach(s => {
    if (!byEvent[s.event_type]) byEvent[s.event_type] = [];
    byEvent[s.event_type].push(s);
  });

  const getUserPrefValue = (eventType: string, channel: string): boolean => {
    const pref = userPrefs?.find(p => p.event_type === eventType && p.channel === channel);
    return pref ? pref.is_enabled : true; // Default enabled if no preference set
  };

  if (Object.keys(byEvent).length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Aucune notification disponible pour votre profil.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
      <p className="text-sm font-medium text-muted-foreground">Gérer mes notifications</p>
      {Object.entries(byEvent).map(([eventType, channels]) => (
        <div key={eventType} className="space-y-2">
          <p className="text-sm font-semibold">{EVENT_LABELS[eventType] || eventType}</p>
          <div className="grid grid-cols-3 gap-2">
            {channels.map(setting => {
              const channelInfo = CHANNEL_ICONS[setting.channel];
              const Icon = channelInfo?.icon || Bell;
              const isEnabled = getUserPrefValue(setting.event_type, setting.channel);
              return (
                <div key={setting.id} className="flex items-center gap-1.5">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => upsertMutation.mutate({
                      event_type: setting.event_type,
                      channel: setting.channel,
                      is_enabled: checked,
                    })}
                    className="scale-75"
                  />
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">{channelInfo?.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

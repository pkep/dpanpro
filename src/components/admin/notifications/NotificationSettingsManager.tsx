import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, MessageSquare, Mail, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface NotificationSetting {
  id: string;
  event_type: string;
  channel: string;
  is_enabled: boolean;
  applicable_roles: string[];
  description: string | null;
}

const EVENT_LABELS: Record<string, string> = {
  dispatch_assignment: 'Dispatch / Assignation',
  status_change: 'Changement de statut',
  new_intervention: 'Nouvelle intervention',
  quote_modification: 'Modification de devis',
  new_message: 'Nouveau message',
  payment_required: 'Paiement requis',
  payment_authorized: 'Paiement autorisé',
  arrival_reminder: 'Rappel d\'arrivée',
  payout_notification: 'Versement technicien',
  client_cancellation: 'Annulation client',
};

const CHANNEL_CONFIG = {
  push: { label: 'Push', icon: Bell, color: 'text-blue-600' },
  sms: { label: 'SMS', icon: Smartphone, color: 'text-green-600' },
  email: { label: 'Email', icon: Mail, color: 'text-orange-600' },
};

const ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  technician: 'Technicien',
  admin: 'Admin',
  manager: 'Manager',
};

export function NotificationSettingsManager() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .order('event_type');
      if (error) throw error;
      return data as NotificationSetting[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('notification_settings')
        .update({ is_enabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success('Paramètre mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  // Group by channel
  const byChannel: Record<string, NotificationSetting[]> = { push: [], sms: [], email: [] };
  settings?.forEach(s => {
    if (byChannel[s.channel]) byChannel[s.channel].push(s);
  });

  // Group by event
  const byEvent: Record<string, NotificationSetting[]> = {};
  settings?.forEach(s => {
    if (!byEvent[s.event_type]) byEvent[s.event_type] = [];
    byEvent[s.event_type].push(s);
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="by-channel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="by-channel" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Par canal
          </TabsTrigger>
          <TabsTrigger value="by-event" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Par événement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="by-channel" className="space-y-4">
          {Object.entries(CHANNEL_CONFIG).map(([channel, config]) => {
            const channelSettings = byChannel[channel] || [];
            const enabledCount = channelSettings.filter(s => s.is_enabled).length;
            const Icon = config.icon;

            return (
              <Card key={channel}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <div>
                        <CardTitle className="text-lg">{config.label}</CardTitle>
                        <CardDescription>
                          {enabledCount}/{channelSettings.length} événements activés
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {channelSettings.map(setting => (
                      <div key={setting.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{EVENT_LABELS[setting.event_type] || setting.event_type}</p>
                          <div className="flex gap-1 mt-1">
                            {setting.applicable_roles.map(role => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {ROLE_LABELS[role] || role}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Switch
                          checked={setting.is_enabled}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: setting.id, is_enabled: checked })}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="by-event" className="space-y-4">
          {Object.entries(byEvent).map(([eventType, eventSettings]) => (
            <Card key={eventType}>
              <CardHeader>
                <CardTitle className="text-lg">{EVENT_LABELS[eventType] || eventType}</CardTitle>
                <CardDescription>
                  {eventSettings[0]?.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {eventSettings.map(setting => {
                    const config = CHANNEL_CONFIG[setting.channel as keyof typeof CHANNEL_CONFIG];
                    const Icon = config?.icon || Bell;
                    return (
                      <div key={setting.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config?.color}`} />
                          <span className="text-sm font-medium">{config?.label}</span>
                        </div>
                        <Switch
                          checked={setting.is_enabled}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: setting.id, is_enabled: checked })}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1 mt-3">
                  {eventSettings[0]?.applicable_roles.map(role => (
                    <Badge key={role} variant="outline" className="text-xs">
                      {ROLE_LABELS[role] || role}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

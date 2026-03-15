import type { INotificationsService, WelcomeNotificationInput, TechnicianApplicationNotificationInput } from '@/services/interfaces/notifications.interface';
import { supabase } from '@/integrations/supabase/client';

class SupabaseNotificationsService implements INotificationsService {
  async sendWelcomeAdmin(input: WelcomeNotificationInput): Promise<void> {
    const { error } = await supabase.functions.invoke('send-welcome-admin-email', {
      body: input,
    });
    if (error) throw error;
  }

  async notifyTechnicianApplication(input: TechnicianApplicationNotificationInput): Promise<void> {
    const { error } = await supabase.functions.invoke('notify-technician-application', {
      body: input,
    });
    if (error) throw error;
  }
}

export const notificationsService = new SupabaseNotificationsService();

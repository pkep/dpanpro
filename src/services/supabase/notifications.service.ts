import { supabase } from '@/integrations/supabase/client';
import type { INotificationsService } from '@/services/interfaces/notifications.interface';
import {
  NotificationSetting,
  SendContactEmailInput, SendInvoiceEmailInput, SendQuoteEmailInput,
  TechnicianApplicationNotificationInput,
  WelcomeNotificationInput
} from "@/types/service.types.ts";

class SupabaseNotificationsService implements INotificationsService {
  async sendWelcomeAdmin(input: WelcomeNotificationInput): Promise<void> {
    await supabase.functions.invoke('send-welcome-admin-email', { body: input });
  }
  async notifyTechnicianApplication(input: TechnicianApplicationNotificationInput): Promise<void> {
    await supabase.functions.invoke('notify-technician-application', { body: input });
  }
  async savePushToken(fcmToken: string, userId?: string, email?: string): Promise<void> {
    await supabase.from('push_subscriptions').upsert({ fcm_token: fcmToken, user_id: userId, email, is_active: true });
  }
  async sendInvoiceEmail(input: SendInvoiceEmailInput): Promise<void> {
    await supabase.functions.invoke('send-invoice-email', { body: input });
  }

  async sendQuoteEmail(input: SendQuoteEmailInput): Promise<void> {
    await supabase.functions.invoke('send-quote-email', { body: input });
  }

  async sendContactEmail(input: SendContactEmailInput): Promise<void> {
    const { error } = await supabase.functions.invoke('send-contact-email', { body: input });
    if (error) throw error;
  }

  async getNotificationSettings(): Promise<NotificationSetting[]> {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('id, event_type, channel, is_enabled, applicable_roles, description')
      .order('event_type', { ascending: true })
      .order('channel',     { ascending: true });

    if (error) throw error;

    return (data || []).map((s: any): NotificationSetting => ({
      id:              s.id,
      eventType:       s.event_type,
      channel:         s.channel,
      isEnabled:       s.is_enabled,
      applicableRoles: s.applicable_roles ?? [],
      description:     s.description ?? null,
    }));
  }

  async toggleNotificationSetting(id: string, isEnabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('notification_settings')
      .update({ is_enabled: isEnabled })
      .eq('id', id);

    if (error) throw error;
  }

  async notifyPaymentRequired(interventionId: string, reason?: string): Promise<void> {
    const { error } = await supabase.functions.invoke('notify-payment-required', {
      body: { interventionId, reason: reason ?? 'start_intervention' },
    });
    if (error) throw error;
  }

  async incrementPaymentAuthorization(interventionId: string, additionalAmount: number): Promise<void> {
    const { error } = await supabase.functions.invoke('increment-authorization', {
      body: { interventionId, additionalAmount },
    });
    if (error) throw error;
  }
  async notifyPaymentAuthorized(interventionId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('notify-payment-authorized', {
      body: { interventionId },
    });
    if (error) throw error;
  }

  async notifyQuoteModification(modificationId: string, clientEmail: string, clientPhone?: string): Promise<void> {
    const { error } = await supabase.functions.invoke('notify-quote-modification', {
      body: { modificationId, clientEmail, clientPhone },
    });
    if (error) throw error;
  }

  async notifyManualDispatch(interventionId: string, technicianId: string, dispatchedBy: string): Promise<void> {
    const { error } = await supabase.functions.invoke('notify-manual-dispatch', {
      body: { interventionId, technicianId, dispatchedBy, notifyAgentReceivers: false },
    });
    if (error) throw error;
  }

  async notifyPayout(payoutId: string, technicianEmail: string): Promise<void> {
    const { error } = await supabase.functions.invoke('notify-payout', {
      body: { payoutId, technicianEmail },
    });
    if (error) throw error;
  }

  async notifyWelcomeJobTechnician(technicianId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('notify-welcome-job-technician', {
      body: { technicianId },
    });
    if (error) throw error;
  }

  async notifyManagerAfterJobTechnician(technicianId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('notify-manager-after-job-technician', {
      body: { technicianId },
    });
    if (error) throw error;
  }

  async notifyNewIntervention(interventionId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('notify-new-intervention', {
      body: { interventionId },
    });
    if (error) throw error;
  }
}

export const notificationsService = new SupabaseNotificationsService();

/** Alias conservé pour les imports existants. */
export const supabaseNotificationsService = notificationsService;


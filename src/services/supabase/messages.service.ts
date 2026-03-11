import { supabase } from '@/integrations/supabase/client';

export interface InterventionMessage {
  id: string;
  interventionId: string;
  senderId: string;
  senderRole: 'technician' | 'client';
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface DbInterventionMessage {
  id: string;
  intervention_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

class MessagesService {
  /**
   * Send a message
   */
  async sendMessage(params: {
    interventionId: string;
    senderId: string;
    senderRole: 'technician' | 'client';
    message: string;
  }): Promise<InterventionMessage> {
    const { data, error } = await supabase
      .from('intervention_messages')
      .insert({
        intervention_id: params.interventionId,
        sender_id: params.senderId,
        sender_role: params.senderRole,
        message: params.message,
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapToMessage(data as unknown as DbInterventionMessage);
  }

  /**
   * Get messages for an intervention
   */
  async getMessages(interventionId: string): Promise<InterventionMessage[]> {
    const { data, error } = await supabase
      .from('intervention_messages')
      .select('*')
      .eq('intervention_id', interventionId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return ((data || []) as unknown as DbInterventionMessage[]).map(this.mapToMessage);
  }

  /**
   * Mark messages as read
   */
  async markAsRead(interventionId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('intervention_messages')
      .update({ is_read: true } as Record<string, unknown>)
      .eq('intervention_id', interventionId)
      .neq('sender_id', userId);

    if (error) throw error;
  }

  /**
   * Get unread count for an intervention
   */
  async getUnreadCount(interventionId: string, userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('intervention_messages')
      .select('*', { count: 'exact', head: true })
      .eq('intervention_id', interventionId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return count || 0;
  }

  private mapToMessage(data: DbInterventionMessage): InterventionMessage {
    return {
      id: data.id,
      interventionId: data.intervention_id,
      senderId: data.sender_id,
      senderRole: data.sender_role as 'technician' | 'client',
      message: data.message,
      isRead: data.is_read,
      createdAt: data.created_at,
    };
  }
}

export const messagesService = new MessagesService();

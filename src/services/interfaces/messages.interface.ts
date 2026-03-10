import type { InterventionMessage } from '@/services/messages/messages.service';

export interface IMessagesService {
  sendMessage(params: {
    interventionId: string;
    senderId: string;
    senderRole: 'technician' | 'client';
    message: string;
  }): Promise<InterventionMessage>;
  getMessages(interventionId: string): Promise<InterventionMessage[]>;
  markAsRead(interventionId: string, userId: string): Promise<void>;
  getUnreadCount(interventionId: string, userId: string): Promise<number>;
}

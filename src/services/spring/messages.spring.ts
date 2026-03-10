import type { IMessagesService } from '@/services/interfaces/messages.interface';
import type { InterventionMessage } from '@/services/messages/messages.service';
import { springHttp } from './http-client';

export class SpringMessagesService implements IMessagesService {
  async sendMessage(params: any): Promise<InterventionMessage> {
    return springHttp.post('/messages', params);
  }
  async getMessages(interventionId: string): Promise<InterventionMessage[]> {
    return springHttp.get(`/messages/${interventionId}`);
  }
  async markAsRead(interventionId: string, userId: string): Promise<void> {
    await springHttp.patch(`/messages/${interventionId}/read`, { userId });
  }
  async getUnreadCount(interventionId: string, userId: string): Promise<number> {
    const result = await springHttp.get<{ count: number }>(`/messages/${interventionId}/unread`, { userId });
    return result.count;
  }
}

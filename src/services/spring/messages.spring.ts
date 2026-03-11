import type { IMessagesService } from '@/services/interfaces/messages.interface';
import type { InterventionMessage } from '@/services/supabase/messages.service';
import { springHttp } from './http-client';

export class SpringMessagesService implements IMessagesService {
  // POST /interventions/{id}/messages
  async sendMessage(params: any): Promise<InterventionMessage> {
    const { interventionId, ...body } = params;
    return springHttp.post(`/interventions/${interventionId}/messages`, body);
  }

  // GET /interventions/{id}/messages
  async getMessages(interventionId: string): Promise<InterventionMessage[]> {
    return springHttp.get(`/interventions/${interventionId}/messages`);
  }

  // POST /interventions/{id}/messages/read (server uses auth user, no userId needed)
  async markAsRead(interventionId: string, _userId: string): Promise<void> {
    await springHttp.post(`/interventions/${interventionId}/messages/read`);
  }

  // GET /interventions/{id}/messages/unread-count
  async getUnreadCount(interventionId: string, _userId: string): Promise<number> {
    const result = await springHttp.get<{ count: number }>(`/interventions/${interventionId}/messages/unread-count`);
    return result.count;
  }
}

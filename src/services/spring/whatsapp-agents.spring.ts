import { springHttp } from './http-client';
import type {
  IWhatsAppAgentsService,
  WhatsAppAgent,
  WhatsAppAgentInput,
} from '@/services/interfaces/whatsapp-agents.interface';

export class SpringWhatsAppAgentsService implements IWhatsAppAgentsService {
  async getActive(): Promise<WhatsAppAgent[]> {
    return springHttp.get<WhatsAppAgent[]>('/whatsapp-agents/public');
  }

  async getAll(): Promise<WhatsAppAgent[]> {
    return springHttp.get<WhatsAppAgent[]>('/whatsapp-agents');
  }

  async create(input: WhatsAppAgentInput): Promise<WhatsAppAgent> {
    return springHttp.post<WhatsAppAgent>('/whatsapp-agents', {
      name: input.name,
      phone: input.phone,
      isActive: input.isActive,
    });
  }

  async update(id: string, input: WhatsAppAgentInput): Promise<WhatsAppAgent> {
    return springHttp.put<WhatsAppAgent>(`/whatsapp-agents/${id}`, {
      name: input.name,
      phone: input.phone,
      isActive: input.isActive,
    });
  }

  async delete(id: string): Promise<void> {
    await springHttp.delete(`/whatsapp-agents/${id}`);
  }
}

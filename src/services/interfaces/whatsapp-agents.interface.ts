export interface WhatsAppAgent {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WhatsAppAgentInput {
  name: string;
  phone: string;
  isActive: boolean;
}

export interface IWhatsAppAgentsService {
  getActive(): Promise<WhatsAppAgent[]>;
  getAll(): Promise<WhatsAppAgent[]>;
  create(input: WhatsAppAgentInput): Promise<WhatsAppAgent>;
  update(id: string, input: WhatsAppAgentInput): Promise<WhatsAppAgent>;
  delete(id: string): Promise<void>;
}

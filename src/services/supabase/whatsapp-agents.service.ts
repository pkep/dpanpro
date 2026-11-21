import { supabase } from '@/integrations/supabase/client';
import type {
  IWhatsAppAgentsService,
  WhatsAppAgent,
  WhatsAppAgentInput,
} from '@/services/interfaces/whatsapp-agents.interface';
import { toStoredWhatsAppPhone } from '@/lib/whatsappAgentPhone';

// Nouvelle table non encore présente dans les types Supabase générés.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface WhatsAppAgentRow {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

function fromRow(row: WhatsAppAgentRow): WhatsAppAgent {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class SupabaseWhatsAppAgentsService implements IWhatsAppAgentsService {
  async getActive(): Promise<WhatsAppAgent[]> {
    const { data, error } = await db
      .from('whatsapp_agents')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return ((data || []) as WhatsAppAgentRow[]).map(fromRow);
  }

  async getAll(): Promise<WhatsAppAgent[]> {
    const { data, error } = await db
      .from('whatsapp_agents')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return ((data || []) as WhatsAppAgentRow[]).map(fromRow);
  }

  async create(input: WhatsAppAgentInput): Promise<WhatsAppAgent> {
    const { data, error } = await db
      .from('whatsapp_agents')
      .insert({
        name: input.name,
        phone: toStoredWhatsAppPhone(input.phone),
        is_active: input.isActive,
      })
      .select()
      .single();

    if (error) throw error;
    return fromRow(data as WhatsAppAgentRow);
  }

  async update(id: string, input: WhatsAppAgentInput): Promise<WhatsAppAgent> {
    const { data, error } = await db
      .from('whatsapp_agents')
      .update({
        name: input.name,
        phone: toStoredWhatsAppPhone(input.phone),
        is_active: input.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return fromRow(data as WhatsAppAgentRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await db
      .from('whatsapp_agents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const supabaseWhatsAppAgentsService = new SupabaseWhatsAppAgentsService();

import { supabase } from '@/integrations/supabase/client';

export interface QuoteModification {
  id: string;
  interventionId: string;
  createdBy: string;
  status: 'pending' | 'approved' | 'declined';
  totalAdditionalAmount: number;
  clientNotifiedAt: string | null;
  clientRespondedAt: string | null;
  notificationToken: string;
  createdAt: string;
  updatedAt: string;
  items: QuoteModificationItem[];
}

export interface QuoteModificationItem {
  id: string;
  modificationId: string;
  itemType: 'service' | 'equipment' | 'other';
  label: string;
  description: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  createdAt: string;
}

export interface CreateQuoteModificationInput {
  interventionId: string;
  createdBy: string;
  items: {
    itemType: 'service' | 'equipment' | 'other';
    label: string;
    description?: string;
    unitPrice: number;
    quantity: number;
  }[];
}

interface DbQuoteModification {
  id: string;
  intervention_id: string;
  created_by: string;
  status: string;
  total_additional_amount: number;
  client_notified_at: string | null;
  client_responded_at: string | null;
  notification_token: string;
  created_at: string;
  updated_at: string;
}

interface DbQuoteModificationItem {
  id: string;
  modification_id: string;
  item_type: string;
  label: string;
  description: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  created_at: string;
}

class QuoteModificationsService {
  /**
   * Create a new quote modification with items
   */
  async createModification(input: CreateQuoteModificationInput): Promise<QuoteModification> {
    // Calculate total
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    // Insert modification
    const { data: modification, error: modError } = await supabase
      .from('quote_modifications')
      .insert({
        intervention_id: input.interventionId,
        created_by: input.createdBy,
        status: 'pending',
        total_additional_amount: totalAmount,
      })
      .select()
      .single();

    if (modError) throw modError;

    // Insert items
    const itemsToInsert = input.items.map((item) => ({
      modification_id: modification.id,
      item_type: item.itemType,
      label: item.label,
      description: item.description || null,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      total_price: item.unitPrice * item.quantity,
    }));

    const { data: items, error: itemsError } = await supabase
      .from('quote_modification_items')
      .insert(itemsToInsert)
      .select();

    if (itemsError) throw itemsError;

    return this.mapToQuoteModification(
      modification as unknown as DbQuoteModification,
      (items || []) as unknown as DbQuoteModificationItem[]
    );
  }

  /**
   * Get modification by ID
   */
  async getModification(id: string): Promise<QuoteModification | null> {
    const { data: modification, error } = await supabase
      .from('quote_modifications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!modification) return null;

    const { data: items } = await supabase
      .from('quote_modification_items')
      .select('*')
      .eq('modification_id', id)
      .order('created_at', { ascending: true });

    return this.mapToQuoteModification(
      modification as unknown as DbQuoteModification,
      (items || []) as unknown as DbQuoteModificationItem[]
    );
  }

  /**
   * Get modification by notification token (for client approval page)
   */
  async getModificationByToken(token: string): Promise<QuoteModification | null> {
    const { data: modification, error } = await supabase
      .from('quote_modifications')
      .select('*')
      .eq('notification_token', token)
      .maybeSingle();

    if (error) throw error;
    if (!modification) return null;

    const { data: items } = await supabase
      .from('quote_modification_items')
      .select('*')
      .eq('modification_id', modification.id)
      .order('created_at', { ascending: true });

    return this.mapToQuoteModification(
      modification as unknown as DbQuoteModification,
      (items || []) as unknown as DbQuoteModificationItem[]
    );
  }

  /**
   * Get all modifications for an intervention
   */
  async getModificationsByIntervention(interventionId: string): Promise<QuoteModification[]> {
    const { data: modifications, error } = await supabase
      .from('quote_modifications')
      .select('*')
      .eq('intervention_id', interventionId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const results: QuoteModification[] = [];
    for (const mod of modifications || []) {
      const { data: items } = await supabase
        .from('quote_modification_items')
        .select('*')
        .eq('modification_id', mod.id)
        .order('created_at', { ascending: true });

      results.push(
        this.mapToQuoteModification(
          mod as unknown as DbQuoteModification,
          (items || []) as unknown as DbQuoteModificationItem[]
        )
      );
    }

    return results;
  }

  /**
   * Approve a quote modification and increment payment authorization
   */
  async approveModification(id: string): Promise<{ incrementResult?: unknown }> {
    // First get the modification to get intervention ID and amount
    const modification = await this.getModification(id);
    if (!modification) {
      throw new Error('Modification not found');
    }

    // Update the modification status
    const { error } = await supabase
      .from('quote_modifications')
      .update({
        status: 'approved',
        client_responded_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', id);

    if (error) throw error;

    // Try to increment the payment authorization
    let incrementResult = null;
    try {
      const { data, error: incrementError } = await supabase.functions.invoke(
        'increment-authorization',
        {
          body: {
            interventionId: modification.interventionId,
            additionalAmount: modification.totalAdditionalAmount,
          },
        }
      );

      if (incrementError) {
        console.error('Failed to increment authorization:', incrementError);
      } else {
        incrementResult = data;
        console.log('Authorization increment result:', data);
      }
    } catch (err) {
      console.error('Error calling increment-authorization:', err);
    }

    return { incrementResult };
  }

  /**
   * Decline a quote modification with reason
   */
  async declineModification(id: string, reason?: string): Promise<void> {
    const updateData: Record<string, unknown> = {
      status: 'declined',
      client_responded_at: new Date().toISOString(),
    };
    
    if (reason) {
      updateData.decline_reason = reason;
    }

    const { error } = await supabase
      .from('quote_modifications')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Mark modification as notified
   */
  async markAsNotified(id: string): Promise<void> {
    const { error } = await supabase
      .from('quote_modifications')
      .update({
        client_notified_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get pending modification for an intervention
   */
  async getPendingModification(interventionId: string): Promise<QuoteModification | null> {
    const { data: modification, error } = await supabase
      .from('quote_modifications')
      .select('*')
      .eq('intervention_id', interventionId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!modification) return null;

    const { data: items } = await supabase
      .from('quote_modification_items')
      .select('*')
      .eq('modification_id', modification.id)
      .order('created_at', { ascending: true });

    return this.mapToQuoteModification(
      modification as unknown as DbQuoteModification,
      (items || []) as unknown as DbQuoteModificationItem[]
    );
  }

  private mapToQuoteModification(
    data: DbQuoteModification,
    items: DbQuoteModificationItem[]
  ): QuoteModification {
    return {
      id: data.id,
      interventionId: data.intervention_id,
      createdBy: data.created_by,
      status: data.status as QuoteModification['status'],
      totalAdditionalAmount: data.total_additional_amount,
      clientNotifiedAt: data.client_notified_at,
      clientRespondedAt: data.client_responded_at,
      notificationToken: data.notification_token,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      items: items.map((item) => ({
        id: item.id,
        modificationId: item.modification_id,
        itemType: item.item_type as QuoteModificationItem['itemType'],
        label: item.label,
        description: item.description,
        unitPrice: item.unit_price,
        quantity: item.quantity,
        totalPrice: item.total_price,
        createdAt: item.created_at,
      })),
    };
  }
}

export const quoteModificationsService = new QuoteModificationsService();

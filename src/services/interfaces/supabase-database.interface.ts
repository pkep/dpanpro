/**
 * Supabase Database Shape Interfaces
 * Centralized database row shapes to avoid duplication across Supabase service implementations
 */

// ── Quotes ──
export interface DbQuoteLine {
  id: string;
  intervention_id: string;
  line_type: string;
  label: string;
  base_price: number;
  multiplier: number;
  calculated_price: number;
  display_order: number;
  created_at: string;
}

export interface DbPriorityMultiplier {
  id: string;
  priority: string;
  multiplier_value: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ── Ratings ──
export interface DbRating {
  id: string;
  intervention_id: string;
  client_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

// ── Services ──
export interface DbService {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  default_priority: string;
  displacement_price: number;
  security_price: number;
  vat_rate_individual: number;
  vat_rate_professional: number;
  target_arrival_time_minutes: number;
}

// ── Quote Modifications ──
export interface DbQuoteModification {
  id: string;
  intervention_id: string;
  created_by: string;
  status: string;
  total_additional_amount: number;
  notification_token: string;
  client_notified_at: string | null;
  client_responded_at: string | null;
  decline_reason: string | null;
  approved_channel: string | null;
  client_signature_data: string | null;
  client_signature_at: string | null;
  client_signature_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbQuoteModificationItem {
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

// ── Intervention Messages ──
export interface DbInterventionMessage {
  id: string;
  intervention_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

// ── Work Photos ──
export interface DbWorkPhoto {
  id: string;
  intervention_id: string;
  photo_url: string;
  description: string | null;
  photo_type: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// ── User Roles ──
export interface DbUserRole {
  id: string;
  user_id: string;
  role: string;
  assigned_at: string;
  revoked_at: string | null;
}

export interface DbManagerPermissions {
  id: string;
  manager_id: string;
  permission: string;
  granted_at: string;
  revoked_at: string | null;
}

// ── Dispatch Configuration ──
export interface DbDispatchConfig {
  id: string;
  setting_name: string;
  setting_value: string | number | boolean;
  updated_at: string;
}

export interface DbConfigHistory {
  id: string;
  config_id: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
}

// ── Invoices ──
export interface DbInvoice {
  id: string;
  intervention_id: string;
  invoice_number: string;
  amount_ht: number;
  vat_rate: number;
  vat_amount: number;
  amount_ttc: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  issued_at: string;
  due_at: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Dispute ──
export interface DbDispute {
  id: string;
  intervention_id: string;
  created_by_id: string;
  dispute_type: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'rejected';
  created_at: string;
  resolved_at: string | null;
}


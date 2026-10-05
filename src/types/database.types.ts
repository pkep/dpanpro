// Types manuels pour les tables (indépendants de Supabase types auto-générés)

export type DbInterventionCategory = 'plumbing' | 'electricity' | 'heating' | 'locksmith' | 'glazing' | 'aircon' | 'other';
export type DbInterventionPriority = 'low' | 'normal' | 'high' | 'urgent';
export type DbInterventionStatus = 'new' | 'assigned' | 'on_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: 'client' | 'technician' | 'admin';
  is_active: boolean;
  is_company: boolean;
  company_name: string | null;
  company_address: string | null;
  siren: string | null;
  vat_number: string | null;
  avatar_url: string | null;
  company_logo_url: string | null;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbIntervention {
  id: string;
  client_id: string;
  technician_id: string | null;
  category: DbInterventionCategory;
  priority: DbInterventionPriority;
  status: DbInterventionStatus;
  title: string;
  description: string | null;
  address: string;
  city: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  estimated_price: number | null;
  final_price: number | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  photos: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tracking_code: string | null;
  client_email: string | null;
  client_phone: string | null;
  questionnaire_resultat_id?: string | null;
  questionnaire_answers?: any;
  prix_min?: number | null;
  prix_max?: number | null;
  invoice_signature_data?: string | null;
  invoice_signed_at?: string | null;
  parent_id_intervention?: string | null;
  escalation_type?: string | null;
  billing_mode?: string | null;
  service_started?: boolean | null;
  customer_consent?: boolean | null;
  escalation_reason?: string | null;
  escalation_notes?: string | null;
  escalation_requested_at?: string | null;
  escalation_completed_at?: string | null;
  escalation_consent_signature_data?: string | null;
  escalation_consent_signed_at?: string | null;
  billing_type?: string | null;
  b2b_partner_id?: string | null;
  b2b_invoice_id?: string | null;
  client_first_name?: string | null;
  client_last_name?: string | null;
  b2b_order_reference?: string | null;
}

export interface DbUserInsert {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  role?: 'client' | 'technician' | 'admin';
  is_active?: boolean;
  is_company?: boolean;
  company_name?: string | null;
  company_address?: string | null;
  siren?: string | null;
  vat_number?: string | null;
}

export interface DbInterventionInsert {
  client_id: string;
  category: DbInterventionCategory;
  title: string;
  description?: string | null;
  address: string;
  city: string;
  postal_code: string;
  priority?: DbInterventionPriority;
  status?: DbInterventionStatus;
  technician_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  estimated_price?: number | null;
  is_active?: boolean;
  client_email?: string | null;
  client_phone?: string | null;
  photos?: string[] | null;
}

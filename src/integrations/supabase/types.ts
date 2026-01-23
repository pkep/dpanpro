export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cancelled_assignments: {
        Row: {
          cancelled_at: string
          created_at: string
          id: string
          intervention_id: string
          reason: string
          technician_id: string
        }
        Insert: {
          cancelled_at?: string
          created_at?: string
          id?: string
          intervention_id: string
          reason: string
          technician_id: string
        }
        Update: {
          cancelled_at?: string
          created_at?: string
          id?: string
          intervention_id?: string
          reason?: string
          technician_id?: string
        }
        Relationships: []
      }
      declined_interventions: {
        Row: {
          created_at: string
          declined_at: string
          id: string
          intervention_id: string
          reason: string
          technician_id: string
        }
        Insert: {
          created_at?: string
          declined_at?: string
          id?: string
          intervention_id: string
          reason: string
          technician_id: string
        }
        Update: {
          created_at?: string
          declined_at?: string
          id?: string
          intervention_id?: string
          reason?: string
          technician_id?: string
        }
        Relationships: []
      }
      dispatch_attempts: {
        Row: {
          attempt_order: number
          created_at: string
          id: string
          intervention_id: string
          notified_at: string | null
          responded_at: string | null
          score: number
          score_breakdown: Json
          status: string
          technician_id: string
          timeout_at: string | null
          updated_at: string
        }
        Insert: {
          attempt_order?: number
          created_at?: string
          id?: string
          intervention_id: string
          notified_at?: string | null
          responded_at?: string | null
          score?: number
          score_breakdown?: Json
          status?: string
          technician_id: string
          timeout_at?: string | null
          updated_at?: string
        }
        Update: {
          attempt_order?: number
          created_at?: string
          id?: string
          intervention_id?: string
          notified_at?: string | null
          responded_at?: string | null
          score?: number
          score_breakdown?: Json
          status?: string
          technician_id?: string
          timeout_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_attempts_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_attempts_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_history: {
        Row: {
          action: string
          comment: string | null
          created_at: string
          id: string
          intervention_id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          action: string
          comment?: string | null
          created_at?: string
          id?: string
          intervention_id: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          action?: string
          comment?: string | null
          created_at?: string
          id?: string
          intervention_id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_history_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_messages: {
        Row: {
          created_at: string
          id: string
          intervention_id: string
          is_read: boolean
          message: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          intervention_id: string
          is_read?: boolean
          message: string
          sender_id: string
          sender_role: string
        }
        Update: {
          created_at?: string
          id?: string
          intervention_id?: string
          is_read?: boolean
          message?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_messages_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_quotes: {
        Row: {
          base_price: number
          calculated_price: number
          created_at: string
          display_order: number
          id: string
          intervention_id: string
          label: string
          line_type: string
          multiplier: number
        }
        Insert: {
          base_price?: number
          calculated_price?: number
          created_at?: string
          display_order?: number
          id?: string
          intervention_id: string
          label: string
          line_type: string
          multiplier?: number
        }
        Update: {
          base_price?: number
          calculated_price?: number
          created_at?: string
          display_order?: number
          id?: string
          intervention_id?: string
          label?: string
          line_type?: string
          multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "intervention_quotes_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_ratings: {
        Row: {
          client_id: string
          comment: string | null
          created_at: string
          id: string
          intervention_id: string
          rating: number
          updated_at: string
        }
        Insert: {
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          intervention_id: string
          rating: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          intervention_id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_ratings_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: true
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          accepted_at: string | null
          address: string
          arrived_at: string | null
          category: string
          city: string
          client_email: string | null
          client_id: string
          client_phone: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_price: number | null
          final_price: number | null
          id: string
          intervention_duration_seconds: number | null
          is_active: boolean
          latitude: number | null
          longitude: number | null
          photos: string[] | null
          postal_code: string
          priority: string
          response_time_seconds: number | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          technician_id: string | null
          title: string
          tracking_code: string | null
          travel_time_seconds: number | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          address: string
          arrived_at?: string | null
          category: string
          city: string
          client_email?: string | null
          client_id: string
          client_phone?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          intervention_duration_seconds?: number | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          photos?: string[] | null
          postal_code: string
          priority?: string
          response_time_seconds?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          technician_id?: string | null
          title: string
          tracking_code?: string | null
          travel_time_seconds?: number | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          address?: string
          arrived_at?: string | null
          category?: string
          city?: string
          client_email?: string | null
          client_id?: string
          client_phone?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          intervention_duration_seconds?: number | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          photos?: string[] | null
          postal_code?: string
          priority?: string
          response_time_seconds?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          technician_id?: string | null
          title?: string
          tracking_code?: string | null
          travel_time_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_applications: {
        Row: {
          address: string
          bank_account_holder: string
          bank_name: string
          bic: string
          birth_date: string
          birth_place: string
          city: string
          company_name: string
          created_at: string
          current_city: string | null
          data_accuracy_confirmed: boolean
          department: string | null
          has_decennial_insurance: boolean
          iban: string
          id: string
          insurance_company: string
          insurance_expiry_date: string
          insurance_policy_number: string
          latitude: number | null
          legal_status: string
          longitude: number | null
          motivation: string
          postal_code: string
          siret: string
          skills: string[]
          status: string
          terms_accepted: boolean
          updated_at: string
          user_id: string | null
          vat_number: string | null
          years_experience: number
        }
        Insert: {
          address: string
          bank_account_holder: string
          bank_name: string
          bic: string
          birth_date: string
          birth_place: string
          city: string
          company_name: string
          created_at?: string
          current_city?: string | null
          data_accuracy_confirmed?: boolean
          department?: string | null
          has_decennial_insurance?: boolean
          iban: string
          id?: string
          insurance_company: string
          insurance_expiry_date: string
          insurance_policy_number: string
          latitude?: number | null
          legal_status: string
          longitude?: number | null
          motivation: string
          postal_code: string
          siret: string
          skills: string[]
          status?: string
          terms_accepted?: boolean
          updated_at?: string
          user_id?: string | null
          vat_number?: string | null
          years_experience: number
        }
        Update: {
          address?: string
          bank_account_holder?: string
          bank_name?: string
          bic?: string
          birth_date?: string
          birth_place?: string
          city?: string
          company_name?: string
          created_at?: string
          current_city?: string | null
          data_accuracy_confirmed?: boolean
          department?: string | null
          has_decennial_insurance?: boolean
          iban?: string
          id?: string
          insurance_company?: string
          insurance_expiry_date?: string
          insurance_policy_number?: string
          latitude?: number | null
          legal_status?: string
          longitude?: number | null
          motivation?: string
          postal_code?: string
          siret?: string
          skills?: string[]
          status?: string
          terms_accepted?: boolean
          updated_at?: string
          user_id?: string | null
          vat_number?: string | null
          years_experience?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_statistics: {
        Row: {
          average_arrival_time_seconds: number | null
          average_intervention_time_seconds: number | null
          average_rating: number | null
          average_response_time_seconds: number | null
          completed_interventions: number
          created_at: string
          id: string
          last_calculated_at: string
          partner_id: string
          total_interventions: number
          updated_at: string
        }
        Insert: {
          average_arrival_time_seconds?: number | null
          average_intervention_time_seconds?: number | null
          average_rating?: number | null
          average_response_time_seconds?: number | null
          completed_interventions?: number
          created_at?: string
          id?: string
          last_calculated_at?: string
          partner_id: string
          total_interventions?: number
          updated_at?: string
        }
        Update: {
          average_arrival_time_seconds?: number | null
          average_intervention_time_seconds?: number | null
          average_rating?: number | null
          average_response_time_seconds?: number | null
          completed_interventions?: number
          created_at?: string
          id?: string
          last_calculated_at?: string
          partner_id?: string
          total_interventions?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_authorizations: {
        Row: {
          amount_authorized: number
          authorization_confirmed_at: string | null
          authorization_requested_at: string
          cancelled_at: string | null
          captured_at: string | null
          client_email: string | null
          client_phone: string | null
          created_at: string
          currency: string
          id: string
          intervention_id: string
          metadata: Json | null
          payment_provider: string
          provider_customer_id: string | null
          provider_payment_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_authorized: number
          authorization_confirmed_at?: string | null
          authorization_requested_at?: string
          cancelled_at?: string | null
          captured_at?: string | null
          client_email?: string | null
          client_phone?: string | null
          created_at?: string
          currency?: string
          id?: string
          intervention_id: string
          metadata?: Json | null
          payment_provider?: string
          provider_customer_id?: string | null
          provider_payment_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_authorized?: number
          authorization_confirmed_at?: string | null
          authorization_requested_at?: string
          cancelled_at?: string | null
          captured_at?: string | null
          client_email?: string | null
          client_phone?: string | null
          created_at?: string
          currency?: string
          id?: string
          intervention_id?: string
          metadata?: Json | null
          payment_provider?: string
          provider_customer_id?: string | null
          provider_payment_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_authorizations_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_multipliers: {
        Row: {
          created_at: string
          display_order: number
          id: string
          label: string
          multiplier: number
          priority: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          label: string
          multiplier?: number
          priority: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          multiplier?: number
          priority?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_modification_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          item_type: string
          label: string
          modification_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          item_type: string
          label: string
          modification_id: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          item_type?: string
          label?: string
          modification_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_modification_items_modification_id_fkey"
            columns: ["modification_id"]
            isOneToOne: false
            referencedRelation: "quote_modifications"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_modifications: {
        Row: {
          client_notified_at: string | null
          client_responded_at: string | null
          created_at: string
          created_by: string
          id: string
          intervention_id: string
          notification_token: string | null
          status: string
          total_additional_amount: number
          updated_at: string
        }
        Insert: {
          client_notified_at?: string | null
          client_responded_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          intervention_id: string
          notification_token?: string | null
          status?: string
          total_additional_amount?: number
          updated_at?: string
        }
        Update: {
          client_notified_at?: string | null
          client_responded_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          intervention_id?: string
          notification_token?: string | null
          status?: string
          total_additional_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_modifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_modifications_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number
          code: string
          created_at: string
          default_priority: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          code: string
          created_at?: string
          default_priority?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          code?: string
          created_at?: string
          default_priority?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      technician_availability: {
        Row: {
          created_at: string
          current_intervention_id: string | null
          id: string
          is_available: boolean
          last_status_change: string
          max_concurrent_interventions: number
          technician_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_intervention_id?: string | null
          id?: string
          is_available?: boolean
          last_status_change?: string
          max_concurrent_interventions?: number
          technician_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_intervention_id?: string | null
          id?: string
          is_available?: boolean
          last_status_change?: string
          max_concurrent_interventions?: number
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_availability_current_intervention_id_fkey"
            columns: ["current_intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_availability_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          password_hash: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          password_hash: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          password_hash?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_tracking_code: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

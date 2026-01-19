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
          address: string
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
          is_active: boolean
          latitude: number | null
          longitude: number | null
          photos: string[] | null
          postal_code: string
          priority: string
          scheduled_at: string | null
          started_at: string | null
          status: string
          technician_id: string | null
          title: string
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          address: string
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
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          photos?: string[] | null
          postal_code: string
          priority?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          technician_id?: string | null
          title: string
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
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
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          photos?: string[] | null
          postal_code?: string
          priority?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          technician_id?: string | null
          title?: string
          tracking_code?: string | null
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
          data_accuracy_confirmed: boolean
          email: string
          first_name: string
          has_decennial_insurance: boolean
          iban: string
          id: string
          insurance_company: string
          insurance_expiry_date: string
          insurance_policy_number: string
          last_name: string
          legal_status: string
          motivation: string
          password_hash: string
          phone: string
          postal_code: string
          siret: string
          skills: string[]
          status: string
          terms_accepted: boolean
          updated_at: string
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
          data_accuracy_confirmed?: boolean
          email: string
          first_name: string
          has_decennial_insurance?: boolean
          iban: string
          id?: string
          insurance_company: string
          insurance_expiry_date: string
          insurance_policy_number: string
          last_name: string
          legal_status: string
          motivation: string
          password_hash: string
          phone: string
          postal_code: string
          siret: string
          skills: string[]
          status?: string
          terms_accepted?: boolean
          updated_at?: string
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
          data_accuracy_confirmed?: boolean
          email?: string
          first_name?: string
          has_decennial_insurance?: boolean
          iban?: string
          id?: string
          insurance_company?: string
          insurance_expiry_date?: string
          insurance_policy_number?: string
          last_name?: string
          legal_status?: string
          motivation?: string
          password_hash?: string
          phone?: string
          postal_code?: string
          siret?: string
          skills?: string[]
          status?: string
          terms_accepted?: boolean
          updated_at?: string
          vat_number?: string | null
          years_experience?: number
        }
        Relationships: []
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

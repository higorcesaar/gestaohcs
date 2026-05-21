export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number;
          bank: string | null;
          color: string | null;
          created_at: string;
          id: string;
          name: string;
          titular: string | null;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          balance?: number;
          bank?: string | null;
          color?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          titular?: string | null;
          type?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          balance?: number;
          bank?: string | null;
          color?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          titular?: string | null;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      allowed_emails: {
        Row: {
          added_by: string | null;
          created_at: string;
          email: string;
          is_admin: boolean;
        };
        Insert: {
          added_by?: string | null;
          created_at?: string;
          email: string;
          is_admin?: boolean;
        };
        Update: {
          added_by?: string | null;
          created_at?: string;
          email?: string;
          is_admin?: boolean;
        };
        Relationships: [];
      };
      cards: {
        Row: {
          bank: string;
          closing_day: number;
          created_at: string;
          credit_limit: number;
          dias_antecedencia_fechamento: number;
          due_day: number;
          id: string;
          name: string;
          titular: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          bank: string;
          closing_day: number;
          created_at?: string;
          credit_limit?: number;
          dias_antecedencia_fechamento?: number;
          due_day: number;
          id?: string;
          name: string;
          titular?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          bank?: string;
          closing_day?: number;
          created_at?: string;
          credit_limit?: number;
          dias_antecedencia_fechamento?: number;
          due_day?: number;
          id?: string;
          name?: string;
          titular?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          name: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      category_budgets: {
        Row: {
          category: string;
          competence_month: string;
          created_at: string;
          group_kind: string;
          id: string;
          planned_amount: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category: string;
          competence_month: string;
          created_at?: string;
          group_kind?: string;
          id?: string;
          planned_amount?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          competence_month?: string;
          created_at?: string;
          group_kind?: string;
          id?: string;
          planned_amount?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      closed_months: {
        Row: {
          closed_at: string;
          competence_month: string;
          id: string;
          user_id: string;
        };
        Insert: {
          closed_at?: string;
          competence_month: string;
          id?: string;
          user_id: string;
        };
        Update: {
          closed_at?: string;
          competence_month?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          created_at: string;
          current_amount: number;
          id: string;
          name: string;
          target_amount: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_amount?: number;
          id?: string;
          name: string;
          target_amount: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_amount?: number;
          id?: string;
          name?: string;
          target_amount?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      monthly_budgets: {
        Row: {
          competence_month: string;
          created_at: string;
          id: string;
          tip_text: string | null;
          total_amount: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          competence_month: string;
          created_at?: string;
          id?: string;
          tip_text?: string | null;
          total_amount?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          competence_month?: string;
          created_at?: string;
          id?: string;
          tip_text?: string | null;
          total_amount?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          email: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          email: string;
          id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          email?: string;
          id?: string;
        };
        Relationships: [];
      };
      telegram_messages: {
        Row: {
          chat_id: number;
          created_at: string;
          forwarded: boolean;
          from_name: string | null;
          from_user_id: number | null;
          from_username: string | null;
          raw_update: Json;
          text: string | null;
          update_id: number;
        };
        Insert: {
          chat_id: number;
          created_at?: string;
          forwarded?: boolean;
          from_name?: string | null;
          from_user_id?: number | null;
          from_username?: string | null;
          raw_update: Json;
          text?: string | null;
          update_id: number;
        };
        Update: {
          chat_id?: number;
          created_at?: string;
          forwarded?: boolean;
          from_name?: string | null;
          from_user_id?: number | null;
          from_username?: string | null;
          raw_update?: Json;
          text?: string | null;
          update_id?: number;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount: number;
          bank: string | null;
          card_id: string | null;
          category: string;
          competence_month: string;
          created_at: string;
          description: string | null;
          id: string;
          installment_no: number | null;
          installments_total: number | null;
          kind: string;
          occurred_on: string;
          payment_method: string | null;
          status: string;
          titular: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          bank?: string | null;
          card_id?: string | null;
          category: string;
          competence_month?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          installment_no?: number | null;
          installments_total?: number | null;
          kind: string;
          occurred_on?: string;
          payment_method?: string | null;
          status?: string;
          titular?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          bank?: string | null;
          card_id?: string | null;
          category?: string;
          competence_month?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          installment_no?: number | null;
          installments_total?: number | null;
          kind?: string;
          occurred_on?: string;
          payment_method?: string | null;
          status?: string;
          titular?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          created_at: string;
          currency: string | null;
          default_titular: string | null;
          theme: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          currency?: string | null;
          default_titular?: string | null;
          theme?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          currency?: string | null;
          default_titular?: string | null;
          theme?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const;

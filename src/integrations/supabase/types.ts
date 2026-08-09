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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      body_measurements: {
        Row: {
          created_at: string
          id: string
          left_arm: number | null
          left_thigh: number | null
          lower_belly: number | null
          measured_at: string
          notes: string | null
          right_arm: number | null
          right_thigh: number | null
          shoulder_width: number | null
          upper_belly: number | null
          user_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          left_arm?: number | null
          left_thigh?: number | null
          lower_belly?: number | null
          measured_at?: string
          notes?: string | null
          right_arm?: number | null
          right_thigh?: number | null
          shoulder_width?: number | null
          upper_belly?: number | null
          user_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          left_arm?: number | null
          left_thigh?: number | null
          lower_belly?: number | null
          measured_at?: string
          notes?: string | null
          right_arm?: number | null
          right_thigh?: number | null
          shoulder_width?: number | null
          upper_belly?: number | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      body_weight_logs: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      coach_permissions: {
        Row: {
          coach_email: string
          created_at: string
          id: string
          trainee_id: string
        }
        Insert: {
          coach_email: string
          created_at?: string
          id?: string
          trainee_id: string
        }
        Update: {
          coach_email?: string
          created_at?: string
          id?: string
          trainee_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          description: string | null
          equipment: string | null
          id: string
          muscle_group: string | null
          name: string | null
          name_en: string
          name_he: string
          primary_muscle: string
          status: string
          submitted_by: string | null
          video_url: string | null
          youtube_url: string | null
        }
        Insert: {
          description?: string | null
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          name?: string | null
          name_en: string
          name_he: string
          primary_muscle: string
          status?: string
          submitted_by?: string | null
          video_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          description?: string | null
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          name?: string | null
          name_en?: string
          name_he?: string
          primary_muscle?: string
          status?: string
          submitted_by?: string | null
          video_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      nutrition_adherence_logs: {
        Row: {
          adherence_pct: number
          created_at: string
          id: string
          log_date: string
          user_id: string
        }
        Insert: {
          adherence_pct: number
          created_at?: string
          id?: string
          log_date: string
          user_id: string
        }
        Update: {
          adherence_pct?: number
          created_at?: string
          id?: string
          log_date?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_eaten_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          meal_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date: string
          meal_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          meal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_eaten_logs_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "nutrition_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_meal_items: {
        Row: {
          custom_calories: number | null
          custom_carbs: number | null
          custom_fat: number | null
          custom_name: string | null
          custom_protein: number | null
          food_id: string | null
          grams: number | null
          id: string
          meal_id: string
          order_index: number
        }
        Insert: {
          custom_calories?: number | null
          custom_carbs?: number | null
          custom_fat?: number | null
          custom_name?: string | null
          custom_protein?: number | null
          food_id?: string | null
          grams?: number | null
          id?: string
          meal_id: string
          order_index?: number
        }
        Update: {
          custom_calories?: number | null
          custom_carbs?: number | null
          custom_fat?: number | null
          custom_name?: string | null
          custom_protein?: number | null
          food_id?: string | null
          grams?: number | null
          id?: string
          meal_id?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "nutrition_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_meals: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number
          target_calories: number
          target_carbs: number
          target_fat: number
          target_protein: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number
          target_calories?: number
          target_carbs?: number
          target_fat?: number
          target_protein?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          target_calories?: number
          target_carbs?: number
          target_fat?: number
          target_protein?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          birth_year: number | null
          created_at: string
          gender: string | null
          height_cm: number | null
          id: string
          onboarded: boolean
          theme_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          gender?: string | null
          height_cm?: number | null
          id?: string
          onboarded?: boolean
          theme_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          gender?: string | null
          height_cm?: number | null
          id?: string
          onboarded?: boolean
          theme_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_plan_exercises: {
        Row: {
          exercise_id: string
          group_id: string | null
          group_type: string | null
          id: string
          notes: string | null
          order_index: number
          plan_id: string
          rest_seconds: number
          target_sets: number
        }
        Insert: {
          exercise_id: string
          group_id?: string | null
          group_type?: string | null
          id?: string
          notes?: string | null
          order_index?: number
          plan_id: string
          rest_seconds?: number
          target_sets?: number
        }
        Update: {
          exercise_id?: string
          group_id?: string | null
          group_type?: string | null
          id?: string
          notes?: string | null
          order_index?: number
          plan_id?: string
          rest_seconds?: number
          target_sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_exercises_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          description: string | null
          exercise_ids: string[]
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          exercise_ids?: string[]
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          exercise_ids?: string[]
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          completed_at: string
          created_at: string
          duration_seconds: number
          id: string
          plan_name: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          plan_name: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          plan_name?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_set_logs: {
        Row: {
          created_at: string
          exercise_name: string
          exercise_order: number | null
          id: string
          reps: number
          session_id: string
          set_number: number
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          exercise_name: string
          exercise_order?: number | null
          id?: string
          reps?: number
          session_id: string
          set_number: number
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          exercise_name?: string
          exercise_order?: number | null
          id?: string
          reps?: number
          session_id?: string
          set_number?: number
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      coach_has_access: {
        Args: { _coach_email: string; _trainee_id: string }
        Returns: boolean
      }
      coach_has_access_to_submitter: {
        Args: { _submitted_by: string }
        Returns: boolean
      }
      current_user_email: { Args: never; Returns: string }
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

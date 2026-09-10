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
    PostgrestVersion: "14.5"
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
      pz_athletes: {
        Row: {
          active_injuries: Json
          archived_at: string | null
          available_days_per_week: number
          blacklisted_exercises: Json
          coach_id: string
          created_at: string
          id: string
          myfitflow_user_id: string | null
          name: string
          notes: string | null
          occupational_stress: Database["public"]["Enums"]["pz_stress_level"]
          primary_goal: string | null
          season_phase: Database["public"]["Enums"]["pz_season_phase"] | null
          sport_discipline: string | null
          training_level: Database["public"]["Enums"]["pz_training_level"]
          updated_at: string
        }
        Insert: {
          active_injuries?: Json
          archived_at?: string | null
          available_days_per_week?: number
          blacklisted_exercises?: Json
          coach_id?: string
          created_at?: string
          id?: string
          myfitflow_user_id?: string | null
          name: string
          notes?: string | null
          occupational_stress?: Database["public"]["Enums"]["pz_stress_level"]
          primary_goal?: string | null
          season_phase?: Database["public"]["Enums"]["pz_season_phase"] | null
          sport_discipline?: string | null
          training_level?: Database["public"]["Enums"]["pz_training_level"]
          updated_at?: string
        }
        Update: {
          active_injuries?: Json
          archived_at?: string | null
          available_days_per_week?: number
          blacklisted_exercises?: Json
          coach_id?: string
          created_at?: string
          id?: string
          myfitflow_user_id?: string | null
          name?: string
          notes?: string | null
          occupational_stress?: Database["public"]["Enums"]["pz_stress_level"]
          primary_goal?: string | null
          season_phase?: Database["public"]["Enums"]["pz_season_phase"] | null
          sport_discipline?: string | null
          training_level?: Database["public"]["Enums"]["pz_training_level"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pz_athletes_myfitflow_user_id_fkey"
            columns: ["myfitflow_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pz_coaches: {
        Row: {
          display_name: string
          email: string
          id: string
          requested_at: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: Database["public"]["Enums"]["pz_coach_role"]
          status: Database["public"]["Enums"]["pz_coach_status"]
          updated_at: string
        }
        Insert: {
          display_name: string
          email: string
          id: string
          requested_at?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: Database["public"]["Enums"]["pz_coach_role"]
          status?: Database["public"]["Enums"]["pz_coach_status"]
          updated_at?: string
        }
        Update: {
          display_name?: string
          email?: string
          id?: string
          requested_at?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: Database["public"]["Enums"]["pz_coach_role"]
          status?: Database["public"]["Enums"]["pz_coach_status"]
          updated_at?: string
        }
        Relationships: []
      }
      pz_exercise_kinesiology: {
        Row: {
          exercise_id: string
          is_compound: boolean
          is_curated: boolean
          is_unilateral: boolean
          joint_stress: Json
          movement_pattern: Database["public"]["Enums"]["pz_movement_pattern"]
          muscle_contributions: Json
          systemic_load: number
          updated_at: string
        }
        Insert: {
          exercise_id: string
          is_compound?: boolean
          is_curated?: boolean
          is_unilateral?: boolean
          joint_stress?: Json
          movement_pattern: Database["public"]["Enums"]["pz_movement_pattern"]
          muscle_contributions?: Json
          systemic_load?: number
          updated_at?: string
        }
        Update: {
          exercise_id?: string
          is_compound?: boolean
          is_curated?: boolean
          is_unilateral?: boolean
          joint_stress?: Json
          movement_pattern?: Database["public"]["Enums"]["pz_movement_pattern"]
          muscle_contributions?: Json
          systemic_load?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pz_exercise_kinesiology_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: true
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      pz_joints: {
        Row: {
          code: string
          name_en: string
          name_he: string
        }
        Insert: {
          code: string
          name_en: string
          name_he: string
        }
        Update: {
          code?: string
          name_en?: string
          name_he?: string
        }
        Relationships: []
      }
      pz_macrocycles: {
        Row: {
          athlete_id: string
          coach_id: string
          created_at: string
          id: string
          primary_objective: string | null
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          coach_id?: string
          created_at?: string
          id?: string
          primary_objective?: string | null
          start_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          primary_objective?: string | null
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pz_macrocycles_athlete_id_coach_id_fkey"
            columns: ["athlete_id", "coach_id"]
            isOneToOne: false
            referencedRelation: "pz_athletes"
            referencedColumns: ["id", "coach_id"]
          },
        ]
      }
      pz_mesocycles: {
        Row: {
          block_type: Database["public"]["Enums"]["pz_block_type"]
          coach_id: string
          created_at: string
          duration_weeks: number
          id: string
          macrocycle_id: string
          notes: string | null
          order_index: number
          progression_config: Json
          progression_strategy: Database["public"]["Enums"]["pz_progression_strategy"]
          title: string | null
          updated_at: string
        }
        Insert: {
          block_type: Database["public"]["Enums"]["pz_block_type"]
          coach_id?: string
          created_at?: string
          duration_weeks: number
          id?: string
          macrocycle_id: string
          notes?: string | null
          order_index: number
          progression_config?: Json
          progression_strategy?: Database["public"]["Enums"]["pz_progression_strategy"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          block_type?: Database["public"]["Enums"]["pz_block_type"]
          coach_id?: string
          created_at?: string
          duration_weeks?: number
          id?: string
          macrocycle_id?: string
          notes?: string | null
          order_index?: number
          progression_config?: Json
          progression_strategy?: Database["public"]["Enums"]["pz_progression_strategy"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pz_mesocycles_macrocycle_id_coach_id_fkey"
            columns: ["macrocycle_id", "coach_id"]
            isOneToOne: false
            referencedRelation: "pz_macrocycles"
            referencedColumns: ["id", "coach_id"]
          },
        ]
      }
      pz_microcycles: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          is_deload: boolean
          mesocycle_id: string
          notes: string | null
          updated_at: string
          week_number: number
        }
        Insert: {
          coach_id?: string
          created_at?: string
          id?: string
          is_deload?: boolean
          mesocycle_id: string
          notes?: string | null
          updated_at?: string
          week_number: number
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          is_deload?: boolean
          mesocycle_id?: string
          notes?: string | null
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "pz_microcycles_mesocycle_id_coach_id_fkey"
            columns: ["mesocycle_id", "coach_id"]
            isOneToOne: false
            referencedRelation: "pz_mesocycles"
            referencedColumns: ["id", "coach_id"]
          },
        ]
      }
      pz_muscles: {
        Row: {
          code: string
          name_en: string
          name_he: string
          region: string
          sort_order: number
        }
        Insert: {
          code: string
          name_en: string
          name_he: string
          region: string
          sort_order?: number
        }
        Update: {
          code?: string
          name_en?: string
          name_he?: string
          region?: string
          sort_order?: number
        }
        Relationships: []
      }
      pz_prescriptions: {
        Row: {
          coach_cues: string | null
          coach_id: string
          created_at: string
          exercise_id: string
          group_label: string | null
          id: string
          intensity_pct_1rm: number | null
          load_kg: number | null
          order_index: number
          reps_max: number
          reps_min: number
          rest_seconds: number | null
          session_id: string
          sets: number
          target_rir: number | null
          target_rpe: number | null
          tempo: string | null
          updated_at: string
        }
        Insert: {
          coach_cues?: string | null
          coach_id?: string
          created_at?: string
          exercise_id: string
          group_label?: string | null
          id?: string
          intensity_pct_1rm?: number | null
          load_kg?: number | null
          order_index: number
          reps_max?: number
          reps_min?: number
          rest_seconds?: number | null
          session_id: string
          sets?: number
          target_rir?: number | null
          target_rpe?: number | null
          tempo?: string | null
          updated_at?: string
        }
        Update: {
          coach_cues?: string | null
          coach_id?: string
          created_at?: string
          exercise_id?: string
          group_label?: string | null
          id?: string
          intensity_pct_1rm?: number | null
          load_kg?: number | null
          order_index?: number
          reps_max?: number
          reps_min?: number
          rest_seconds?: number | null
          session_id?: string
          sets?: number
          target_rir?: number | null
          target_rpe?: number | null
          tempo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pz_prescriptions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pz_prescriptions_session_id_coach_id_fkey"
            columns: ["session_id", "coach_id"]
            isOneToOne: false
            referencedRelation: "pz_sessions"
            referencedColumns: ["id", "coach_id"]
          },
        ]
      }
      pz_sessions: {
        Row: {
          coach_id: string
          created_at: string
          day_of_week: number
          id: string
          microcycle_id: string
          notes: string | null
          session_focus: string | null
          session_title: string
          updated_at: string
        }
        Insert: {
          coach_id?: string
          created_at?: string
          day_of_week: number
          id?: string
          microcycle_id: string
          notes?: string | null
          session_focus?: string | null
          session_title?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          day_of_week?: number
          id?: string
          microcycle_id?: string
          notes?: string | null
          session_focus?: string | null
          session_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pz_sessions_microcycle_id_coach_id_fkey"
            columns: ["microcycle_id", "coach_id"]
            isOneToOne: false
            referencedRelation: "pz_microcycles"
            referencedColumns: ["id", "coach_id"]
          },
        ]
      }
      pz_volume_landmarks: {
        Row: {
          mav: number
          mev: number
          mrv: number
          muscle_code: string
          mv: number
          training_level: Database["public"]["Enums"]["pz_training_level"]
        }
        Insert: {
          mav: number
          mev: number
          mrv: number
          muscle_code: string
          mv: number
          training_level: Database["public"]["Enums"]["pz_training_level"]
        }
        Update: {
          mav?: number
          mev?: number
          mrv?: number
          muscle_code?: string
          mv?: number
          training_level?: Database["public"]["Enums"]["pz_training_level"]
        }
        Relationships: [
          {
            foreignKeyName: "pz_volume_landmarks_muscle_code_fkey"
            columns: ["muscle_code"]
            isOneToOne: false
            referencedRelation: "pz_muscles"
            referencedColumns: ["code"]
          },
        ]
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
      pz_is_admin: { Args: never; Returns: boolean }
      pz_is_approved: { Args: never; Returns: boolean }
      pz_request_access: {
        Args: { p_display_name: string }
        Returns: {
          display_name: string
          email: string
          id: string
          requested_at: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: Database["public"]["Enums"]["pz_coach_role"]
          status: Database["public"]["Enums"]["pz_coach_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "pz_coaches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pz_review_coach: {
        Args: {
          p_coach_id: string
          p_note?: string
          p_status: Database["public"]["Enums"]["pz_coach_status"]
        }
        Returns: {
          display_name: string
          email: string
          id: string
          requested_at: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: Database["public"]["Enums"]["pz_coach_role"]
          status: Database["public"]["Enums"]["pz_coach_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "pz_coaches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pz_set_coach_role: {
        Args: {
          p_coach_id: string
          p_role: Database["public"]["Enums"]["pz_coach_role"]
        }
        Returns: {
          display_name: string
          email: string
          id: string
          requested_at: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: Database["public"]["Enums"]["pz_coach_role"]
          status: Database["public"]["Enums"]["pz_coach_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "pz_coaches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pz_update_my_profile: {
        Args: { p_display_name: string }
        Returns: {
          display_name: string
          email: string
          id: string
          requested_at: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: Database["public"]["Enums"]["pz_coach_role"]
          status: Database["public"]["Enums"]["pz_coach_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "pz_coaches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      replace_plan_exercises: {
        Args: { p_plan_id: string; p_rows: Json }
        Returns: undefined
      }
      replace_session_set_logs: {
        Args: { p_rows: Json; p_session_id: string }
        Returns: undefined
      }
    }
    Enums: {
      pz_block_type:
        | "gpp"
        | "hypertrophy"
        | "strength"
        | "power"
        | "peaking"
        | "deload"
        | "technique"
      pz_coach_role: "admin" | "coach"
      pz_coach_status: "pending" | "approved" | "rejected" | "suspended"
      pz_movement_pattern:
        | "squat"
        | "hinge"
        | "lunge"
        | "horizontal_push"
        | "vertical_push"
        | "horizontal_pull"
        | "vertical_pull"
        | "carry"
        | "rotation"
        | "anti_rotation"
        | "isolation"
        | "plyometric"
        | "conditioning"
      pz_progression_strategy:
        | "none"
        | "linear_load"
        | "double_progression"
        | "volume_ramp"
        | "intensity_ramp"
        | "dup"
      pz_season_phase: "off_season" | "pre_season" | "in_season" | "transition"
      pz_stress_level: "low" | "medium" | "high"
      pz_training_level: "beginner" | "intermediate" | "advanced"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      pz_block_type: [
        "gpp",
        "hypertrophy",
        "strength",
        "power",
        "peaking",
        "deload",
        "technique",
      ],
      pz_coach_role: ["admin", "coach"],
      pz_coach_status: ["pending", "approved", "rejected", "suspended"],
      pz_movement_pattern: [
        "squat",
        "hinge",
        "lunge",
        "horizontal_push",
        "vertical_push",
        "horizontal_pull",
        "vertical_pull",
        "carry",
        "rotation",
        "anti_rotation",
        "isolation",
        "plyometric",
        "conditioning",
      ],
      pz_progression_strategy: [
        "none",
        "linear_load",
        "double_progression",
        "volume_ramp",
        "intensity_ramp",
        "dup",
      ],
      pz_season_phase: ["off_season", "pre_season", "in_season", "transition"],
      pz_stress_level: ["low", "medium", "high"],
      pz_training_level: ["beginner", "intermediate", "advanced"],
    },
  },
} as const

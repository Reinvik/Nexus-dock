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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      a3_projects: {
        Row: {
          action_plan: Json | null
          background: string | null
          background_image_url: string | null
          company_id: string | null
          countermeasures: string | null
          created_at: string
          current_condition: string | null
          current_condition_image_url: string | null
          date: string | null
          execution_plan: string | null
          five_whys: Json | null
          follow_up_data: Json | null
          follow_up_notes: string | null
          goal: string | null
          id: string
          ishikawas: Json | null
          pareto_data: Json | null
          responsible: string | null
          root_cause: string | null
          status: string | null
          title: string
        }
        Insert: {
          action_plan?: Json | null
          background?: string | null
          background_image_url?: string | null
          company_id?: string | null
          countermeasures?: string | null
          created_at?: string
          current_condition?: string | null
          current_condition_image_url?: string | null
          date?: string | null
          execution_plan?: string | null
          five_whys?: Json | null
          follow_up_data?: Json | null
          follow_up_notes?: string | null
          goal?: string | null
          id?: string
          ishikawas?: Json | null
          pareto_data?: Json | null
          responsible?: string | null
          root_cause?: string | null
          status?: string | null
          title: string
        }
        Update: {
          action_plan?: Json | null
          background?: string | null
          background_image_url?: string | null
          company_id?: string | null
          countermeasures?: string | null
          created_at?: string
          current_condition?: string | null
          current_condition_image_url?: string | null
          date?: string | null
          execution_plan?: string | null
          five_whys?: Json | null
          follow_up_data?: Json | null
          follow_up_notes?: string | null
          goal?: string | null
          id?: string
          ishikawas?: Json | null
          pareto_data?: Json | null
          responsible?: string | null
          root_cause?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      agent_registry: {
        Row: {
          capabilities: string[] | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          tech_stack: string[] | null
        }
        Insert: {
          capabilities?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          tech_stack?: string[] | null
        }
        Update: {
          capabilities?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          tech_stack?: string[] | null
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          api_key: string | null
          created_at: string
          is_enabled: boolean
          system_prompt: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          is_enabled?: boolean
          system_prompt?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          created_at?: string
          is_enabled?: boolean
          system_prompt?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenant_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_5s: {
        Row: {
          area: string | null
          audit_date: string | null
          auditor: string | null
          company_id: string | null
          created_at: string | null
          date: string | null
          id: number
          status: string | null
          title: string | null
          total_score: number | null
        }
        Insert: {
          area?: string | null
          audit_date?: string | null
          auditor?: string | null
          company_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: number
          status?: string | null
          title?: string | null
          total_score?: number | null
        }
        Update: {
          area?: string | null
          audit_date?: string | null
          auditor?: string | null
          company_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: number
          status?: string | null
          title?: string | null
          total_score?: number | null
        }
        Relationships: []
      }
      audit_5s_entries: {
        Row: {
          audit_id: number | null
          comment: string | null
          company_id: string | null
          created_at: string | null
          id: number
          question: string | null
          score: number | null
          section: string | null
        }
        Insert: {
          audit_id?: number | null
          comment?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: number
          question?: string | null
          score?: number | null
          section?: string | null
        }
        Update: {
          audit_id?: number | null
          comment?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: number
          question?: string | null
          score?: number | null
          section?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lean_audit_5s_entries_audit"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audit_5s"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auth_codes: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          is_used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          button_link: string | null
          button_text: string | null
          created_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          order_index: number | null
          subtitle: string | null
          tenant_id: string | null
          title: string
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          order_index?: number | null
          subtitle?: string | null
          tenant_id?: string | null
          title: string
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          order_index?: number | null
          subtitle?: string | null
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_events: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          product_name: string
          session_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name: string
          session_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name?: string
          session_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          order_index: number | null
          slug: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          order_index?: number | null
          slug?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          order_index?: number | null
          slug?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenger_id: string | null
          challenger_name: string | null
          created_at: string | null
          id: string
          opponent_id: string | null
          status: string | null
        }
        Insert: {
          challenger_id?: string | null
          challenger_name?: string | null
          created_at?: string | null
          id?: string
          opponent_id?: string | null
          status?: string | null
        }
        Update: {
          challenger_id?: string | null
          challenger_name?: string | null
          created_at?: string | null
          id?: string
          opponent_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          allowed_apps: string[] | null
          allowed_modules: string[] | null
          created_at: string | null
          database_schema: string | null
          id: string
          is_lobby: boolean | null
          name: string
          schema_name: string
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          allowed_apps?: string[] | null
          allowed_modules?: string[] | null
          created_at?: string | null
          database_schema?: string | null
          id?: string
          is_lobby?: boolean | null
          name: string
          schema_name: string
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          allowed_apps?: string[] | null
          allowed_modules?: string[] | null
          created_at?: string | null
          database_schema?: string | null
          id?: string
          is_lobby?: boolean | null
          name?: string
          schema_name?: string
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          applies_to: string
          category_id: string | null
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          min_purchase_amount: number | null
          product_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          applies_to: string
          category_id?: string | null
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          min_purchase_amount?: number | null
          product_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          applies_to?: string
          category_id?: string | null
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          min_purchase_amount?: number | null
          product_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_bibliographies: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          id: string
          title: string
          type: string
          updated_at: string | null
          url: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          type: string
          updated_at?: string | null
          url: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          type?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_bibliographies_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "skills_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_teachers: {
        Row: {
          added_at: string | null
          course_id: string | null
          id: string
          role: string | null
          teacher_id: string | null
        }
        Insert: {
          added_at?: string | null
          course_id?: string | null
          id?: string
          role?: string | null
          teacher_id?: string | null
        }
        Update: {
          added_at?: string | null
          course_id?: string | null
          id?: string
          role?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_teachers_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "skills_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          cost: number
          created_at: string | null
          free_shipping_threshold: number | null
          id: string
          is_active: boolean
          name: string
          order_index: number | null
          tenant_id: string | null
          updated_at: string | null
          zone_type: string
        }
        Insert: {
          cost?: number
          created_at?: string | null
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean
          name: string
          order_index?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          zone_type?: string
        }
        Update: {
          cost?: number
          created_at?: string | null
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      docks: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string
          default_tractor: string | null
          default_trailer: string | null
          id: string
          name: string
          phone: string | null
          rut: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_tractor?: string | null
          default_trailer?: string | null
          id?: string
          name: string
          phone?: string | null
          rut: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_tractor?: string | null
          default_trailer?: string | null
          id?: string
          name?: string
          phone?: string | null
          rut?: string
          updated_at?: string
        }
        Relationships: []
      }
      five_s_cards: {
        Row: {
          after_image_url: string | null
          after_image_urls: string[] | null
          area: string
          assigned_to: string | null
          card_date: string | null
          card_number: string | null
          category: string | null
          close_date: string | null
          closure_comment: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          findings: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          priority: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          after_image_url?: string | null
          after_image_urls?: string[] | null
          area: string
          assigned_to?: string | null
          card_date?: string | null
          card_number?: string | null
          category?: string | null
          close_date?: string | null
          closure_comment?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          findings?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          priority?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          after_image_url?: string | null
          after_image_urls?: string[] | null
          area?: string
          assigned_to?: string | null
          card_date?: string | null
          card_number?: string | null
          category?: string | null
          close_date?: string | null
          closure_comment?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          findings?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          priority?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      foods_meal_plan: {
        Row: {
          created_at: string | null
          date: string
          id: string
          manual_meal_name: string | null
          recipe_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          manual_meal_name?: string | null
          recipe_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          manual_meal_name?: string | null
          recipe_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "foods_meal_plan_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "foods_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      foods_pantry: {
        Row: {
          category: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          item_name: string
          location: string | null
          quantity: number | null
          status: string | null
          unit: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          item_name: string
          location?: string | null
          quantity?: number | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          item_name?: string
          location?: string | null
          quantity?: number | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      foods_recipes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          ingredients_json: Json | null
          is_feasible: boolean | null
          steps: Json | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          ingredients_json?: Json | null
          is_feasible?: boolean | null
          steps?: Json | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          ingredients_json?: Json | null
          is_feasible?: boolean | null
          steps?: Json | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      game_data: {
        Row: {
          created_at: string | null
          pet: Json | null
          player_state: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          pet?: Json | null
          player_state?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          pet?: Json | null
          player_state?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      health_stats: {
        Row: {
          cpu_load: number | null
          created_at: string | null
          device_name: string | null
          disk_free_gb: number | null
          id: string
          ram_free_mb: number | null
          ram_usage_mb: number | null
          tailscale_status: string | null
        }
        Insert: {
          cpu_load?: number | null
          created_at?: string | null
          device_name?: string | null
          disk_free_gb?: number | null
          id?: string
          ram_free_mb?: number | null
          ram_usage_mb?: number | null
          tailscale_status?: string | null
        }
        Update: {
          cpu_load?: number | null
          created_at?: string | null
          device_name?: string | null
          disk_free_gb?: number | null
          id?: string
          ram_free_mb?: number | null
          ram_usage_mb?: number | null
          tailscale_status?: string | null
        }
        Relationships: []
      }
      mafia_actions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          player_id: string
          room_id: string
          round_number: number
          target_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          player_id: string
          room_id: string
          round_number: number
          target_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          player_id?: string
          room_id?: string
          round_number?: number
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mafia_actions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "mafia_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mafia_actions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "mafia_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mafia_actions_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "mafia_players"
            referencedColumns: ["id"]
          },
        ]
      }
      mafia_logs: {
        Row: {
          created_at: string | null
          id: string
          message: string
          room_id: string | null
          round_number: number
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          room_id?: string | null
          round_number: number
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          room_id?: string | null
          round_number?: number
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mafia_logs_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "mafia_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      mafia_player_stats: {
        Row: {
          created_at: string | null
          event_benefits: number | null
          failed_traps: number | null
          id: string
          player_id: string
          player_name: string
          room_id: string
          successful_betrayals: number | null
          successful_traps: number | null
          times_betrayed: number | null
          times_trapped: number | null
          total_betray: number | null
          total_cooperate: number | null
          total_earned: number | null
          total_lost: number | null
          total_trap: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_benefits?: number | null
          failed_traps?: number | null
          id?: string
          player_id: string
          player_name: string
          room_id: string
          successful_betrayals?: number | null
          successful_traps?: number | null
          times_betrayed?: number | null
          times_trapped?: number | null
          total_betray?: number | null
          total_cooperate?: number | null
          total_earned?: number | null
          total_lost?: number | null
          total_trap?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_benefits?: number | null
          failed_traps?: number | null
          id?: string
          player_id?: string
          player_name?: string
          room_id?: string
          successful_betrayals?: number | null
          successful_traps?: number | null
          times_betrayed?: number | null
          times_trapped?: number | null
          total_betray?: number | null
          total_cooperate?: number | null
          total_earned?: number | null
          total_lost?: number | null
          total_trap?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mafia_players: {
        Row: {
          avatar_url: string | null
          balance: number
          created_at: string
          has_accountant: boolean
          id: string
          is_capo: boolean
          is_incognito: boolean
          last_action: string | null
          name: string
          room_id: string
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          has_accountant?: boolean
          id?: string
          is_capo?: boolean
          is_incognito?: boolean
          last_action?: string | null
          name: string
          room_id: string
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          has_accountant?: boolean
          id?: string
          is_capo?: boolean
          is_incognito?: boolean
          last_action?: string | null
          name?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mafia_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "mafia_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      mafia_rooms: {
        Row: {
          active_event: string | null
          active_event_label: string | null
          bonus_enabled: boolean | null
          created_at: string
          game_mode: string | null
          global_pool: number
          id: string
          max_rounds: number | null
          name: string | null
          round_number: number
          status: string
        }
        Insert: {
          active_event?: string | null
          active_event_label?: string | null
          bonus_enabled?: boolean | null
          created_at?: string
          game_mode?: string | null
          global_pool?: number
          id?: string
          max_rounds?: number | null
          name?: string | null
          round_number?: number
          status?: string
        }
        Update: {
          active_event?: string | null
          active_event_label?: string | null
          bonus_enabled?: boolean | null
          created_at?: string
          game_mode?: string | null
          global_pool?: number
          id?: string
          max_rounds?: number | null
          name?: string | null
          round_number?: number
          status?: string
        }
        Relationships: []
      }
      news_analysis: {
        Row: {
          analysis_json: Json | null
          cluster_id: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          analysis_json?: Json | null
          cluster_id?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          analysis_json?: Json | null
          cluster_id?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          bias: string | null
          created_at: string | null
          id: string
          published_at: string | null
          source: string | null
          title: string
          url: string
        }
        Insert: {
          bias?: string | null
          created_at?: string | null
          id?: string
          published_at?: string | null
          source?: string | null
          title: string
          url: string
        }
        Update: {
          bias?: string | null
          created_at?: string | null
          id?: string
          published_at?: string | null
          source?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      news_daily_digest: {
        Row: {
          cluster_count: number | null
          clusters: Json
          created_at: string | null
          digest_date: string
          error_message: string | null
          id: string
          processing_status: string | null
          raw_article_count: number | null
          scope: string
        }
        Insert: {
          cluster_count?: number | null
          clusters?: Json
          created_at?: string | null
          digest_date?: string
          error_message?: string | null
          id?: string
          processing_status?: string | null
          raw_article_count?: number | null
          scope: string
        }
        Update: {
          cluster_count?: number | null
          clusters?: Json
          created_at?: string | null
          digest_date?: string
          error_message?: string | null
          id?: string
          processing_status?: string | null
          raw_article_count?: number | null
          scope?: string
        }
        Relationships: []
      }
      news_global: {
        Row: {
          bias_analysis: Json | null
          blindspot_analysis: Json | null
          content: string | null
          created_at: string | null
          id: string
          published_at: string | null
          source_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          bias_analysis?: Json | null
          blindspot_analysis?: Json | null
          content?: string | null
          created_at?: string | null
          id?: string
          published_at?: string | null
          source_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          bias_analysis?: Json | null
          blindspot_analysis?: Json | null
          content?: string | null
          created_at?: string | null
          id?: string
          published_at?: string | null
          source_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscribers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_agent_memory: {
        Row: {
          blockers: string | null
          created_at: string
          decisions_made: string | null
          feature_status: string | null
          id: string
          lessons_learned: string | null
          modified_files: string[] | null
          module_context: string
          next_steps: string | null
          session_goal: string
          stack_snapshot: string | null
          technical_summary: string | null
        }
        Insert: {
          blockers?: string | null
          created_at?: string
          decisions_made?: string | null
          feature_status?: string | null
          id?: string
          lessons_learned?: string | null
          modified_files?: string[] | null
          module_context: string
          next_steps?: string | null
          session_goal: string
          stack_snapshot?: string | null
          technical_summary?: string | null
        }
        Update: {
          blockers?: string | null
          created_at?: string
          decisions_made?: string | null
          feature_status?: string | null
          id?: string
          lessons_learned?: string | null
          modified_files?: string[] | null
          module_context?: string
          next_steps?: string | null
          session_goal?: string
          stack_snapshot?: string | null
          technical_summary?: string | null
        }
        Relationships: []
      }
      nexus_network_carousel_images: {
        Row: {
          app_id: string
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string
        }
        Insert: {
          app_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url: string
        }
        Update: {
          app_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string
        }
        Relationships: []
      }
      operations: {
        Row: {
          agent_assigned: string | null
          architect_comments: string | null
          created_at: string | null
          description: string | null
          id: string
          impact_score: number | null
          priority: string | null
          result_data: Json | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          agent_assigned?: string | null
          architect_comments?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          impact_score?: number | null
          priority?: string | null
          result_data?: Json | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          agent_assigned?: string | null
          architect_comments?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          impact_score?: number | null
          priority?: string | null
          result_data?: Json | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ordenes_bot: {
        Row: {
          error: string | null
          execution_logs: Json | null
          fecha_creacion: string | null
          fin: string | null
          id: string
          inicio: string | null
          mensaje: string | null
          nombre_archivo_original: string | null
          parametros: Json | null
          result_payload: Json | null
          ruta_archivo: string | null
          status: string
          tipo_bot: string
          worker: string | null
        }
        Insert: {
          error?: string | null
          execution_logs?: Json | null
          fecha_creacion?: string | null
          fin?: string | null
          id?: string
          inicio?: string | null
          mensaje?: string | null
          nombre_archivo_original?: string | null
          parametros?: Json | null
          result_payload?: Json | null
          ruta_archivo?: string | null
          status?: string
          tipo_bot: string
          worker?: string | null
        }
        Update: {
          error?: string | null
          execution_logs?: Json | null
          fecha_creacion?: string | null
          fin?: string | null
          id?: string
          inicio?: string | null
          mensaje?: string | null
          nombre_archivo_original?: string | null
          parametros?: Json | null
          result_payload?: Json | null
          ruta_archivo?: string | null
          status?: string
          tipo_bot?: string
          worker?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string | null
          customer_email: string | null
          delivery_status: string | null
          discount_amount: number | null
          flow_token: string | null
          id: string
          is_delivered: boolean | null
          items: Json
          payment_details: Json | null
          shipping_details: Json | null
          status: string | null
          tenant_id: string | null
          total: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string | null
          customer_email?: string | null
          delivery_status?: string | null
          discount_amount?: number | null
          flow_token?: string | null
          id?: string
          is_delivered?: boolean | null
          items: Json
          payment_details?: Json | null
          shipping_details?: Json | null
          status?: string | null
          tenant_id?: string | null
          total: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string | null
          customer_email?: string | null
          delivery_status?: string | null
          discount_amount?: number | null
          flow_token?: string | null
          id?: string
          is_delivered?: boolean | null
          items?: Json
          payment_details?: Json | null
          shipping_details?: Json | null
          status?: string | null
          tenant_id?: string | null
          total?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          allowed_apps: string[] | null
          created_at: string | null
          domain: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          allowed_apps?: string[] | null
          created_at?: string | null
          domain?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          allowed_apps?: string[] | null
          created_at?: string | null
          domain?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      patent_requests: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          patente: string
          result_data: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          patente: string
          result_data?: Json | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          patente?: string
          result_data?: Json | null
          status?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          discount_badge: string | null
          id: string
          image_url: string | null
          images: string[] | null
          is_active: boolean | null
          is_on_offer: boolean | null
          name: string
          order_index: number | null
          original_price: number | null
          price: number
          stock: number
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_badge?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_on_offer?: boolean | null
          name: string
          order_index?: number | null
          original_price?: number | null
          price?: number
          stock?: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_badge?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_on_offer?: boolean | null
          name?: string
          order_index?: number | null
          original_price?: number | null
          price?: number
          stock?: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          email: string
          full_name: string
          has_ai_access: boolean | null
          id: string
          is_active: boolean | null
          is_authorized: boolean | null
          is_company_admin: boolean | null
          is_platform_superadmin: boolean | null
          last_login: string | null
          organization_id: string | null
          role: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          full_name: string
          has_ai_access?: boolean | null
          id: string
          is_active?: boolean | null
          is_authorized?: boolean | null
          is_company_admin?: boolean | null
          is_platform_superadmin?: boolean | null
          last_login?: string | null
          organization_id?: string | null
          role: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          has_ai_access?: boolean | null
          id?: string
          is_active?: boolean | null
          is_authorized?: boolean | null
          is_company_admin?: boolean | null
          is_platform_superadmin?: boolean | null
          last_login?: string | null
          organization_id?: string | null
          role?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey1"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          is_blocker: boolean | null
          is_reached: boolean | null
          project_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          is_blocker?: boolean | null
          is_reached?: boolean | null
          project_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          is_blocker?: boolean | null
          is_reached?: boolean | null
          project_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_s_curve_data: {
        Row: {
          actual: number | null
          created_at: string | null
          id: string
          planned: number
          project_id: string | null
          week: string
        }
        Insert: {
          actual?: number | null
          created_at?: string | null
          id?: string
          planned: number
          project_id?: string | null
          week: string
        }
        Update: {
          actual?: number | null
          created_at?: string | null
          id?: string
          planned?: number
          project_id?: string | null
          week?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_s_curve_data_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          created_at: string | null
          dependencies: string[] | null
          end_date: string
          id: string
          is_disabled: boolean | null
          progress: number | null
          project_context: string
          project_id: string | null
          start_date: string
          styles: Json | null
          task_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dependencies?: string[] | null
          end_date: string
          id?: string
          is_disabled?: boolean | null
          progress?: number | null
          project_context: string
          project_id?: string | null
          start_date: string
          styles?: Json | null
          task_type: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dependencies?: string[] | null
          end_date?: string
          id?: string
          is_disabled?: boolean | null
          progress?: number | null
          project_context?: string
          project_id?: string | null
          start_date?: string
          styles?: Json | null
          task_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          context: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          next_milestone_in: number | null
          risk_level: string | null
          updated_at: string | null
          weekly_debt: number | null
        }
        Insert: {
          context: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          next_milestone_in?: number | null
          risk_level?: string | null
          updated_at?: string | null
          weekly_debt?: number | null
        }
        Update: {
          context?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          next_milestone_in?: number | null
          risk_level?: string | null
          updated_at?: string | null
          weekly_debt?: number | null
        }
        Relationships: []
      }
      quick_wins: {
        Row: {
          category: string | null
          cause: string | null
          company_id: string | null
          completed_at: string | null
          completion_comment: string | null
          completion_image_url: string | null
          completion_image_urls: Json | null
          created_at: string
          created_by: string | null
          date: string | null
          deadline: string | null
          description: string | null
          effort_score: number | null
          id: string
          image_url: string | null
          image_urls: Json | null
          impact: string | null
          impact_score: number | null
          likes: number | null
          proposed_solution: string | null
          responsible: string | null
          status: string | null
          title: string
        }
        Insert: {
          category?: string | null
          cause?: string | null
          company_id?: string | null
          completed_at?: string | null
          completion_comment?: string | null
          completion_image_url?: string | null
          completion_image_urls?: Json | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          deadline?: string | null
          description?: string | null
          effort_score?: number | null
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          impact?: string | null
          impact_score?: number | null
          likes?: number | null
          proposed_solution?: string | null
          responsible?: string | null
          status?: string | null
          title: string
        }
        Update: {
          category?: string | null
          cause?: string | null
          company_id?: string | null
          completed_at?: string | null
          completion_comment?: string | null
          completion_image_url?: string | null
          completion_image_urls?: Json | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          deadline?: string | null
          description?: string | null
          effort_score?: number | null
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          impact?: string | null
          impact_score?: number | null
          likes?: number | null
          proposed_solution?: string | null
          responsible?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          tenant_id: string | null
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          tenant_id?: string | null
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          tenant_id?: string | null
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_answers: {
        Row: {
          ai_feedback: string | null
          answer_text: string | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string | null
          selected_option: number | null
          student_exam_id: string | null
          updated_at: string | null
        }
        Insert: {
          ai_feedback?: string | null
          answer_text?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          selected_option?: number | null
          student_exam_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_feedback?: string | null
          answer_text?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          selected_option?: number | null
          student_exam_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_skills_answers_attempt"
            columns: ["student_exam_id"]
            isOneToOne: false
            referencedRelation: "skills_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_skills_answers_question"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "skills_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_attempts: {
        Row: {
          exam_id: string | null
          id: string
          is_submitted: boolean | null
          started_at: string | null
          student_id: string | null
          submitted_at: string | null
          time_remaining_seconds: number | null
        }
        Insert: {
          exam_id?: string | null
          id?: string
          is_submitted?: boolean | null
          started_at?: string | null
          student_id?: string | null
          submitted_at?: string | null
          time_remaining_seconds?: number | null
        }
        Update: {
          exam_id?: string | null
          id?: string
          is_submitted?: boolean | null
          started_at?: string | null
          student_id?: string | null
          submitted_at?: string | null
          time_remaining_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_skills_attempts_exam"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "skills_validations"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_career_chat: {
        Row: {
          content: string
          created_at: string
          display: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          display?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          display?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      skills_career_roles: {
        Row: {
          description: string | null
          gaps: Json | null
          name: string
          stats: Json
          years: string | null
        }
        Insert: {
          description?: string | null
          gaps?: Json | null
          name: string
          stats: Json
          years?: string | null
        }
        Update: {
          description?: string | null
          gaps?: Json | null
          name?: string
          stats?: Json
          years?: string | null
        }
        Relationships: []
      }
      skills_courses: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          grading_scale: Json | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          sence_url: string | null
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          grading_scale?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          sence_url?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          grading_scale?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          sence_url?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      skills_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string | null
          id: string
          joined_at: string | null
          student_id: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          id?: string
          joined_at?: string | null
          student_id?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          id?: string
          joined_at?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skills_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "skills_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_grades: {
        Row: {
          grade: number
          graded_at: string | null
          graded_by: string | null
          id: string
          max_points: number
          percentage: number
          student_exam_id: string | null
          total_points: number
        }
        Insert: {
          grade: number
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_points: number
          percentage: number
          student_exam_id?: string | null
          total_points: number
        }
        Update: {
          grade?: number
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_points?: number
          percentage?: number
          student_exam_id?: string | null
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_skills_grades_attempt"
            columns: ["student_exam_id"]
            isOneToOne: false
            referencedRelation: "skills_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_instructor_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_used: boolean | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_skills_instructor_codes_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_skills_instructor_codes_used_by"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_profiles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      skills_questions: {
        Row: {
          correct_answer: string | null
          created_at: string | null
          exam_id: string | null
          grading_rubric: string | null
          id: string
          options: Json | null
          order_num: number
          points: number | null
          question_text: string
          question_type: string
          topic: string | null
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string | null
          exam_id?: string | null
          grading_rubric?: string | null
          id?: string
          options?: Json | null
          order_num: number
          points?: number | null
          question_text: string
          question_type: string
          topic?: string | null
        }
        Update: {
          correct_answer?: string | null
          created_at?: string | null
          exam_id?: string | null
          grading_rubric?: string | null
          id?: string
          options?: Json | null
          order_num?: number
          points?: number | null
          question_text?: string
          question_type?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_skills_questions_exam"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "skills_validations"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_talent_profiles: {
        Row: {
          career_path: Json | null
          created_at: string | null
          current_competencies: Json | null
          role_definition: Json | null
          target_role: string | null
          test_history: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          career_path?: Json | null
          created_at?: string | null
          current_competencies?: Json | null
          role_definition?: Json | null
          target_role?: string | null
          test_history?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          career_path?: Json | null
          created_at?: string | null
          current_competencies?: Json | null
          role_definition?: Json | null
          target_role?: string | null
          test_history?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_talent_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_validations: {
        Row: {
          audience_description: string | null
          available_from: string | null
          available_until: string | null
          course_id: string | null
          created_at: string | null
          custom_instructions: string | null
          description: string | null
          difficulty_level: number | null
          evaluation_type: string | null
          exam_format: string | null
          id: string
          is_active: boolean | null
          is_published: boolean | null
          source_content: string | null
          source_type: string | null
          target_audience: string | null
          time_limit_minutes: number | null
          title: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          audience_description?: string | null
          available_from?: string | null
          available_until?: string | null
          course_id?: string | null
          created_at?: string | null
          custom_instructions?: string | null
          description?: string | null
          difficulty_level?: number | null
          evaluation_type?: string | null
          exam_format?: string | null
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          source_content?: string | null
          source_type?: string | null
          target_audience?: string | null
          time_limit_minutes?: number | null
          title: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          audience_description?: string | null
          available_from?: string | null
          available_until?: string | null
          course_id?: string | null
          created_at?: string | null
          custom_instructions?: string | null
          description?: string | null
          difficulty_level?: number | null
          evaluation_type?: string | null
          exam_format?: string | null
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          source_content?: string | null
          source_type?: string | null
          target_audience?: string | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skills_validations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "skills_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      store_pages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          slug: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          slug: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          slug?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      store_visits: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_registry: {
        Row: {
          created_at: string
          custom_domain: string | null
          display_name: string
          id: string
          is_active: boolean
          plan: string
          schema_name: string
          slug: string
        }
        Insert: {
          created_at?: string
          custom_domain?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          plan?: string
          schema_name: string
          slug: string
        }
        Update: {
          created_at?: string
          custom_domain?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          plan?: string
          schema_name?: string
          slug?: string
        }
        Relationships: []
      }
      user_app_roles: {
        Row: {
          app_context: string
          id: string
          organization_id: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          app_context: string
          id?: string
          organization_id?: string | null
          role: string
          user_id?: string | null
        }
        Update: {
          app_context?: string
          id?: string
          organization_id?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_app_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_app_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          id: string
          plate: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          plate: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          plate?: string
          type?: string
        }
        Relationships: []
      }
      vsm_projects: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          date: string | null
          description: string | null
          efficiency: string | null
          id: string
          image_url: string | null
          lead_time: string | null
          miro_link: string | null
          name: string
          process_time: string | null
          responsible: string | null
          status: string | null
          takt_time: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          description?: string | null
          efficiency?: string | null
          id?: string
          image_url?: string | null
          lead_time?: string | null
          miro_link?: string | null
          name: string
          process_time?: string | null
          responsible?: string | null
          status?: string | null
          takt_time?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          description?: string | null
          efficiency?: string | null
          id?: string
          image_url?: string | null
          lead_time?: string | null
          miro_link?: string | null
          name?: string
          process_time?: string | null
          responsible?: string | null
          status?: string | null
          takt_time?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      web_analytics: {
        Row: {
          created_at: string
          id: string
          path: string | null
          session_id: string | null
          site: string
        }
        Insert: {
          created_at?: string
          id?: string
          path?: string | null
          session_id?: string | null
          site: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string | null
          session_id?: string | null
          site?: string
        }
        Relationships: []
      }
      yard_operations: {
        Row: {
          carrier: string | null
          created_at: string
          dock_id: string | null
          driver: string
          driver_id: string | null
          end_time: string | null
          entry_time: string
          exit_time: string | null
          id: string
          patent: string | null
          phone: string | null
          rut: string | null
          start_time: string | null
          status: string
          tractor_plate: string | null
          trailer_plate: string | null
          type: string
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          dock_id?: string | null
          driver: string
          driver_id?: string | null
          end_time?: string | null
          entry_time?: string
          exit_time?: string | null
          id?: string
          patent?: string | null
          phone?: string | null
          rut?: string | null
          start_time?: string | null
          status?: string
          tractor_plate?: string | null
          trailer_plate?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          dock_id?: string | null
          driver?: string
          driver_id?: string | null
          end_time?: string | null
          entry_time?: string
          exit_time?: string | null
          id?: string
          patent?: string | null
          phone?: string | null
          rut?: string | null
          start_time?: string | null
          status?: string
          tractor_plate?: string | null
          trailer_plate?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yard_operations_dock_id_fkey"
            columns: ["dock_id"]
            isOneToOne: false
            referencedRelation: "docks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yard_operations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      body_measurements: {
        Row: {
          biceps_left_cm: number | null
          biceps_right_cm: number | null
          body_fat_percentage: number | null
          calf_left_cm: number | null
          calf_right_cm: number | null
          chest_cm: number | null
          created_at: string | null
          date: string | null
          hips_cm: number | null
          id: string | null
          neck_cm: number | null
          notes: string | null
          photo_back_url: string | null
          photo_front_url: string | null
          photo_side_url: string | null
          shoulders_cm: number | null
          thigh_left_cm: number | null
          thigh_right_cm: number | null
          user_id: string | null
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          biceps_left_cm?: number | null
          biceps_right_cm?: number | null
          body_fat_percentage?: number | null
          calf_left_cm?: number | null
          calf_right_cm?: number | null
          chest_cm?: number | null
          created_at?: string | null
          date?: string | null
          hips_cm?: number | null
          id?: string | null
          neck_cm?: number | null
          notes?: string | null
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          shoulders_cm?: number | null
          thigh_left_cm?: number | null
          thigh_right_cm?: number | null
          user_id?: string | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          biceps_left_cm?: number | null
          biceps_right_cm?: number | null
          body_fat_percentage?: number | null
          calf_left_cm?: number | null
          calf_right_cm?: number | null
          chest_cm?: number | null
          created_at?: string | null
          date?: string | null
          hips_cm?: number | null
          id?: string | null
          neck_cm?: number | null
          notes?: string | null
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          shoulders_cm?: number | null
          thigh_left_cm?: number | null
          thigh_right_cm?: number | null
          user_id?: string | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          activity_level: string | null
          carbs_ratio: number | null
          created_at: string | null
          daily_calories_target: number | null
          fat_ratio: number | null
          id: string | null
          protein_ratio: number | null
          start_weight_kg: number | null
          target_weight_kg: number | null
          updated_at: string | null
          user_id: string | null
          weekly_goal_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          carbs_ratio?: number | null
          created_at?: string | null
          daily_calories_target?: number | null
          fat_ratio?: number | null
          id?: string | null
          protein_ratio?: number | null
          start_weight_kg?: number | null
          target_weight_kg?: number | null
          updated_at?: string | null
          user_id?: string | null
          weekly_goal_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          carbs_ratio?: number | null
          created_at?: string | null
          daily_calories_target?: number | null
          fat_ratio?: number | null
          id?: string | null
          protein_ratio?: number | null
          start_weight_kg?: number | null
          target_weight_kg?: number | null
          updated_at?: string | null
          user_id?: string | null
          weekly_goal_kg?: number | null
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          exercise_name: string | null
          id: string | null
          notes: string | null
          order_index: number | null
          reps_target_max: number | null
          reps_target_min: number | null
          rest_seconds: number | null
          sets_target: number | null
          workout_id: string | null
        }
        Insert: {
          exercise_name?: string | null
          id?: string | null
          notes?: string | null
          order_index?: number | null
          reps_target_max?: number | null
          reps_target_min?: number | null
          rest_seconds?: number | null
          sets_target?: number | null
          workout_id?: string | null
        }
        Update: {
          exercise_name?: string | null
          id?: string | null
          notes?: string | null
          order_index?: number | null
          reps_target_max?: number | null
          reps_target_min?: number | null
          rest_seconds?: number | null
          sets_target?: number | null
          workout_id?: string | null
        }
        Relationships: []
      }
      workout_log_entries: {
        Row: {
          created_at: string | null
          exercise_name: string | null
          id: string | null
          log_id: string | null
          reps: number | null
          rpe: number | null
          set_number: number | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string | null
          exercise_name?: string | null
          id?: string | null
          log_id?: string | null
          reps?: number | null
          rpe?: number | null
          set_number?: number | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string | null
          exercise_name?: string | null
          id?: string | null
          log_id?: string | null
          reps?: number | null
          rpe?: number | null
          set_number?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          created_at: string | null
          end_time: string | null
          feeling: string | null
          id: string | null
          notes: string | null
          start_time: string | null
          user_id: string | null
          workout_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          feeling?: string | null
          id?: string | null
          notes?: string | null
          start_time?: string | null
          user_id?: string | null
          workout_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          feeling?: string | null
          id?: string | null
          notes?: string | null
          start_time?: string | null
          user_id?: string | null
          workout_id?: string | null
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty: string | null
          estimated_duration_min: number | null
          id: string | null
          is_public: boolean | null
          name: string | null
          tags: string[] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration_min?: number | null
          id?: string | null
          is_public?: boolean | null
          name?: string | null
          tags?: string[] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration_min?: number | null
          id?: string | null
          is_public?: boolean | null
          name?: string | null
          tags?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_course_teachers_to_schema: {
        Args: { target_schema: string }
        Returns: undefined
      }
      append_execution_log: {
        Args: { log_line: string; order_id: string }
        Returns: undefined
      }
      calculate_grade: {
        Args: {
          passing?: number
          percentage: number
          scale_max?: number
          scale_min?: number
        }
        Returns: number
      }
      can_change_company_id: {
        Args: { new_company_id: string; target_user_id: string }
        Returns: boolean
      }
      check_user_is_admin: { Args: never; Returns: boolean }
      create_company_schema: {
        Args: { p_company_name: string; p_schema_name?: string }
        Returns: string
      }
      create_skills_tables_in_schema: {
        Args: { target_schema: string }
        Returns: undefined
      }
      current_company_id: { Args: never; Returns: string }
      decrement_stock: {
        Args: { product_id: string; quantity: number }
        Returns: undefined
      }
      fix_enrollments_fk_in_tenant: {
        Args: { target_schema: string }
        Returns: undefined
      }
      fix_skills_schema_in_tenant: {
        Args: { target_schema: string }
        Returns: undefined
      }
      generate_course_code: { Args: never; Returns: string }
      get_login_stats: {
        Args: never
        Returns: {
          app_source: string
          login_count: number
          login_date: string
          user_email: string
        }[]
      }
      get_user_schema: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_course_owner: { Args: { course_uuid: string }; Returns: boolean }
      is_course_teacher: {
        Args: { check_course_id: string; check_user_id: string }
        Returns: boolean
      }
      is_superadmin: { Args: never; Returns: boolean }
      nexus_is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      medical_equipment_status:
        | "OPERATIONAL"
        | "DOWN"
        | "MAINTENANCE"
        | "RETIRED"
      medical_maintenance_status:
        | "PENDING"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELLED"
      medical_maintenance_type: "PREVENTIVE" | "CORRECTIVE"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      medical_equipment_status: [
        "OPERATIONAL",
        "DOWN",
        "MAINTENANCE",
        "RETIRED",
      ],
      medical_maintenance_status: [
        "PENDING",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
      ],
      medical_maintenance_type: ["PREVENTIVE", "CORRECTIVE"],
    },
  },
} as const

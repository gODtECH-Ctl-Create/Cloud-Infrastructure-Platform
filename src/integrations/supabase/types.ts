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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          branch_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          branch_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          branch_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_paused: boolean
          name: string
          pause_reason: string | null
          paused_at: string | null
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_paused?: boolean
          name: string
          pause_reason?: string | null
          paused_at?: string | null
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_paused?: boolean
          name?: string
          pause_reason?: string | null
          paused_at?: string | null
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_subscriptions: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          ends_on: string | null
          id: string
          plan_id: string
          sold_at_branch_id: string | null
          started_on: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          week_start_dow: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          ends_on?: string | null
          id?: string
          plan_id: string
          sold_at_branch_id?: string | null
          started_on?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          week_start_dow?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          ends_on?: string | null
          id?: string
          plan_id?: string
          sold_at_branch_id?: string | null
          started_on?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          week_start_dow?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_sold_at_branch_id_fkey"
            columns: ["sold_at_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["customer_category"]
          created_at: string
          created_by: string | null
          customer_code: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          qr_token: string
          registered_branch_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: Database["public"]["Enums"]["customer_category"]
          created_at?: string
          created_by?: string | null
          customer_code: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          qr_token?: string
          registered_branch_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["customer_category"]
          created_at?: string
          created_by?: string | null
          customer_code?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          qr_token?: string
          registered_branch_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_registered_branch_id_fkey"
            columns: ["registered_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_minor: number
          branch_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string
          customer_id: string
          id: string
          idempotency_key: string | null
          method: string
          notes: string | null
          paid_at: string
          provider: string | null
          provider_reference: string | null
          recorded_by: string | null
          reference: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount_minor: number
          branch_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          id?: string
          idempotency_key?: string | null
          method?: string
          notes?: string | null
          paid_at?: string
          provider?: string | null
          provider_reference?: string | null
          recorded_by?: string | null
          reference?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_minor?: number
          branch_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          id?: string
          idempotency_key?: string | null
          method?: string
          notes?: string | null
          paid_at?: string
          provider?: string | null
          provider_reference?: string | null
          recorded_by?: string | null
          reference?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rates: {
        Row: {
          branch_id: string | null
          category: Database["public"]["Enums"]["customer_category"]
          created_at: string
          currency: string
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean
          minimum_minutes: number
          name: string
          rate_per_hour_minor: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          category?: Database["public"]["Enums"]["customer_category"]
          created_at?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          minimum_minutes?: number
          name: string
          rate_per_hour_minor?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          category?: Database["public"]["Enums"]["customer_category"]
          created_at?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          minimum_minutes?: number
          name?: string
          rate_per_hour_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      session_pauses: {
        Row: {
          created_at: string
          id: string
          paused_at: string
          paused_by: string | null
          reason: string | null
          resumed_at: string | null
          resumed_by: string | null
          scope: Database["public"]["Enums"]["pause_scope"]
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          paused_at?: string
          paused_by?: string | null
          reason?: string | null
          resumed_at?: string | null
          resumed_by?: string | null
          scope?: Database["public"]["Enums"]["pause_scope"]
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          paused_at?: string
          paused_by?: string | null
          reason?: string | null
          resumed_at?: string | null
          resumed_by?: string | null
          scope?: Database["public"]["Enums"]["pause_scope"]
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_pauses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          amount_due_minor: number
          amount_paid_minor: number
          authorized_user_id: string | null
          billable_minutes: number | null
          billing_mode: Database["public"]["Enums"]["billing_mode"]
          branch_id: string
          closed_by: string | null
          created_at: string
          currency: string
          customer_id: string
          ended_at: string | null
          extension_minutes: number
          id: string
          notes: string | null
          opened_by: string | null
          paused_at: string | null
          paused_seconds: number
          planned_minutes: number | null
          rate_per_hour_minor: number
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          subscription_id: string | null
          subscription_minutes_used: number
          updated_at: string
        }
        Insert: {
          amount_due_minor?: number
          amount_paid_minor?: number
          authorized_user_id?: string | null
          billable_minutes?: number | null
          billing_mode?: Database["public"]["Enums"]["billing_mode"]
          branch_id: string
          closed_by?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          ended_at?: string | null
          extension_minutes?: number
          id?: string
          notes?: string | null
          opened_by?: string | null
          paused_at?: string | null
          paused_seconds?: number
          planned_minutes?: number | null
          rate_per_hour_minor?: number
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          subscription_id?: string | null
          subscription_minutes_used?: number
          updated_at?: string
        }
        Update: {
          amount_due_minor?: number
          amount_paid_minor?: number
          authorized_user_id?: string | null
          billable_minutes?: number | null
          billing_mode?: Database["public"]["Enums"]["billing_mode"]
          branch_id?: string
          closed_by?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          ended_at?: string | null
          extension_minutes?: number
          id?: string
          notes?: string | null
          opened_by?: string | null
          paused_at?: string | null
          paused_seconds?: number
          planned_minutes?: number | null
          rate_per_hour_minor?: number
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          subscription_id?: string | null
          subscription_minutes_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_authorized_user_id_fkey"
            columns: ["authorized_user_id"]
            isOneToOne: false
            referencedRelation: "subscription_authorized_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_branch_access: {
        Row: {
          branch_id: string
          created_at: string
          granted_by: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_branch_access_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          primary_branch_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          primary_branch_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          primary_branch_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_primary_branch_id_fkey"
            columns: ["primary_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_authorized_users: {
        Row: {
          created_at: string
          customer_id: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          relationship: string | null
          subscription_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          relationship?: string | null
          subscription_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          relationship?: string | null
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_authorized_users_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_authorized_users_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_period_days: number
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          max_authorized_users: number
          max_rollover_hours: number
          name: string
          overage_rate_minor: number | null
          price_minor: number
          rollover_enabled: boolean
          updated_at: string
          weekly_hours: number
        }
        Insert: {
          billing_period_days?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_authorized_users?: number
          max_rollover_hours?: number
          name: string
          overage_rate_minor?: number | null
          price_minor?: number
          rollover_enabled?: boolean
          updated_at?: string
          weekly_hours?: number
        }
        Update: {
          billing_period_days?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_authorized_users?: number
          max_rollover_hours?: number
          name?: string
          overage_rate_minor?: number | null
          price_minor?: number
          rollover_enabled?: boolean
          updated_at?: string
          weekly_hours?: number
        }
        Relationships: []
      }
      subscription_weekly_allowances: {
        Row: {
          allowance_hours: number
          created_at: string
          hours_used: number
          id: string
          rollover_in_hours: number
          rollover_out_hours: number
          subscription_id: string
          updated_at: string
          week_start: string
        }
        Insert: {
          allowance_hours?: number
          created_at?: string
          hours_used?: number
          id?: string
          rollover_in_hours?: number
          rollover_out_hours?: number
          subscription_id: string
          updated_at?: string
          week_start: string
        }
        Update: {
          allowance_hours?: number
          created_at?: string
          hours_used?: number
          id?: string
          rollover_in_hours?: number
          rollover_out_hours?: number
          subscription_id?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_weekly_allowances_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_staff: {
        Args: never
        Returns: {
          branch_ids: string[]
          created_at: string
          email: string
          full_name: string
          is_active: boolean
          phone: string
          roles: string[]
          user_id: string
        }[]
      }
      admin_set_branch_access: {
        Args: { _allowed: boolean; _branch_id: string; _user_id: string }
        Returns: undefined
      }
      admin_set_staff_active: {
        Args: { _is_active: boolean; _user_id: string }
        Returns: undefined
      }
      admin_set_staff_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      claim_first_admin: { Args: never; Returns: boolean }
      end_session: {
        Args: { _notes?: string; _session_id: string }
        Returns: {
          amount_due_minor: number
          amount_paid_minor: number
          authorized_user_id: string | null
          billable_minutes: number | null
          billing_mode: Database["public"]["Enums"]["billing_mode"]
          branch_id: string
          closed_by: string | null
          created_at: string
          currency: string
          customer_id: string
          ended_at: string | null
          extension_minutes: number
          id: string
          notes: string | null
          opened_by: string | null
          paused_at: string | null
          paused_seconds: number
          planned_minutes: number | null
          rate_per_hour_minor: number
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          subscription_id: string | null
          subscription_minutes_used: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_weekly_allowance: {
        Args: { _subscription_id: string }
        Returns: {
          allowance_hours: number
          created_at: string
          hours_used: number
          id: string
          rollover_in_hours: number
          rollover_out_hours: number
          subscription_id: string
          updated_at: string
          week_start: string
        }
        SetofOptions: {
          from: "*"
          to: "subscription_weekly_allowances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      extend_session: {
        Args: { _minutes: number; _session_id: string }
        Returns: {
          amount_due_minor: number
          amount_paid_minor: number
          authorized_user_id: string | null
          billable_minutes: number | null
          billing_mode: Database["public"]["Enums"]["billing_mode"]
          branch_id: string
          closed_by: string | null
          created_at: string
          currency: string
          customer_id: string
          ended_at: string | null
          extension_minutes: number
          id: string
          notes: string | null
          opened_by: string | null
          paused_at: string | null
          paused_seconds: number
          planned_minutes: number | null
          rate_per_hour_minor: number
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          subscription_id: string | null
          subscription_minutes_used: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_branch_access: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      pause_session: {
        Args: {
          _reason?: string
          _scope?: Database["public"]["Enums"]["pause_scope"]
          _session_id: string
        }
        Returns: {
          amount_due_minor: number
          amount_paid_minor: number
          authorized_user_id: string | null
          billable_minutes: number | null
          billing_mode: Database["public"]["Enums"]["billing_mode"]
          branch_id: string
          closed_by: string | null
          created_at: string
          currency: string
          customer_id: string
          ended_at: string | null
          extension_minutes: number
          id: string
          notes: string | null
          opened_by: string | null
          paused_at: string | null
          paused_seconds: number
          planned_minutes: number | null
          rate_per_hour_minor: number
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          subscription_id: string | null
          subscription_minutes_used: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      purchase_subscription: {
        Args: {
          _branch_id: string
          _customer_id: string
          _idempotency_key: string
          _method: string
          _notes?: string
          _plan_id: string
          _reference?: string
          _status?: Database["public"]["Enums"]["payment_status"]
        }
        Returns: {
          amount_minor: number
          branch_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string
          customer_id: string
          id: string
          idempotency_key: string | null
          method: string
          notes: string | null
          paid_at: string
          provider: string | null
          provider_reference: string | null
          recorded_by: string | null
          reference: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_session_payment: {
        Args: {
          _amount_minor?: number
          _idempotency_key: string
          _method: string
          _notes?: string
          _reference?: string
          _session_id: string
          _status?: Database["public"]["Enums"]["payment_status"]
        }
        Returns: {
          amount_minor: number
          branch_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string
          customer_id: string
          id: string
          idempotency_key: string | null
          method: string
          notes: string | null
          paid_at: string
          provider: string | null
          provider_reference: string | null
          recorded_by: string | null
          reference: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_rate: {
        Args: {
          _branch_id: string
          _category: Database["public"]["Enums"]["customer_category"]
        }
        Returns: number
      }
      resume_session: {
        Args: { _session_id: string }
        Returns: {
          amount_due_minor: number
          amount_paid_minor: number
          authorized_user_id: string | null
          billable_minutes: number | null
          billing_mode: Database["public"]["Enums"]["billing_mode"]
          branch_id: string
          closed_by: string | null
          created_at: string
          currency: string
          customer_id: string
          ended_at: string | null
          extension_minutes: number
          id: string
          notes: string | null
          opened_by: string | null
          paused_at: string | null
          paused_seconds: number
          planned_minutes: number | null
          rate_per_hour_minor: number
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          subscription_id: string | null
          subscription_minutes_used: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_branch_pause: {
        Args: { _branch_id: string; _paused: boolean; _reason?: string }
        Returns: undefined
      }
      set_customer_active: {
        Args: { _customer_id: string; _is_active: boolean }
        Returns: {
          address: string | null
          category: Database["public"]["Enums"]["customer_category"]
          created_at: string
          created_by: string | null
          customer_code: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          qr_token: string
          registered_branch_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_global_pause: {
        Args: { _paused: boolean; _reason?: string }
        Returns: undefined
      }
      set_subscription_status: {
        Args: {
          _reason?: string
          _status: Database["public"]["Enums"]["subscription_status"]
          _subscription_id: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          customer_id: string
          ends_on: string | null
          id: string
          plan_id: string
          sold_at_branch_id: string | null
          started_on: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          week_start_dow: number
        }
        SetofOptions: {
          from: "*"
          to: "customer_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      staff_is_active: { Args: { _user_id: string }; Returns: boolean }
      start_session: {
        Args: {
          _authorized_user_id?: string
          _branch_id: string
          _customer_id: string
          _planned_minutes?: number
        }
        Returns: {
          amount_due_minor: number
          amount_paid_minor: number
          authorized_user_id: string | null
          billable_minutes: number | null
          billing_mode: Database["public"]["Enums"]["billing_mode"]
          branch_id: string
          closed_by: string | null
          created_at: string
          currency: string
          customer_id: string
          ended_at: string | null
          extension_minutes: number
          id: string
          notes: string | null
          opened_by: string | null
          paused_at: string | null
          paused_seconds: number
          planned_minutes: number | null
          rate_per_hour_minor: number
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          subscription_id: string | null
          subscription_minutes_used: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_payment_status: {
        Args: {
          _payment_id: string
          _reason?: string
          _status: Database["public"]["Enums"]["payment_status"]
        }
        Returns: {
          amount_minor: number
          branch_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string
          customer_id: string
          id: string
          idempotency_key: string | null
          method: string
          notes: string | null
          paid_at: string
          provider: string | null
          provider_reference: string | null
          recorded_by: string | null
          reference: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "attendant"
      billing_mode: "subscription" | "walk_in"
      customer_category: "subscriber" | "walk_in"
      pause_scope: "session" | "branch" | "system"
      payment_status:
        | "pending"
        | "confirmed"
        | "failed"
        | "refunded"
        | "cancelled"
      session_status: "active" | "paused" | "completed" | "cancelled"
      subscription_status: "active" | "paused" | "expired" | "cancelled"
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
    Enums: {
      app_role: ["admin", "manager", "attendant"],
      billing_mode: ["subscription", "walk_in"],
      customer_category: ["subscriber", "walk_in"],
      pause_scope: ["session", "branch", "system"],
      payment_status: [
        "pending",
        "confirmed",
        "failed",
        "refunded",
        "cancelled",
      ],
      session_status: ["active", "paused", "completed", "cancelled"],
      subscription_status: ["active", "paused", "expired", "cancelled"],
    },
  },
} as const

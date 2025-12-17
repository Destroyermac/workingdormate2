
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      colleges: {
        Row: {
          id: string
          name: string
          slug: string
          student_population: number
          email_domains: string[]
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          student_population: number
          email_domains: string[]
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          student_population?: number
          email_domains?: string[]
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          username: string
          email: string
          college_id: string
          college_slug: string
          stripe_account_id: string | null
          payouts_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          email: string
          college_id: string
          college_slug: string
          stripe_account_id?: string | null
          payouts_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          college_id?: string
          college_slug?: string
          stripe_account_id?: string | null
          payouts_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          college_id: string
          title: string
          description: string
          price_amount: number
          price_currency: string
          status: 'open' | 'in_progress' | 'completed' | 'cancelled'
          posted_by_user_id: string
          assigned_to_user_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          college_id: string
          title: string
          description: string
          price_amount: number
          price_currency?: string
          status?: 'open' | 'in_progress' | 'completed' | 'cancelled'
          posted_by_user_id: string
          assigned_to_user_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          college_id?: string
          title?: string
          description?: string
          price_amount?: number
          price_currency?: string
          status?: 'open' | 'in_progress' | 'completed' | 'cancelled'
          posted_by_user_id?: string
          assigned_to_user_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      job_comments: {
        Row: {
          id: string
          job_id: string
          user_id: string
          comment: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          user_id: string
          comment: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          user_id?: string
          comment?: string
          created_at?: string
          updated_at?: string
        }
      }
      applications: {
        Row: {
          id: string
          job_id: string
          applicant_user_id: string
          message: string
          proposed_price_amount: number | null
          proposed_price_currency: string
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          applicant_user_id: string
          message: string
          proposed_price_amount?: number | null
          proposed_price_currency?: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          applicant_user_id?: string
          message?: string
          proposed_price_amount?: number | null
          proposed_price_currency?: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          job_id: string
          poster_user_id: string
          worker_user_id: string
          stream_channel_id: string
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          poster_user_id: string
          worker_user_id: string
          stream_channel_id: string
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          poster_user_id?: string
          worker_user_id?: string
          stream_channel_id?: string
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          reporter_user_id: string
          reported_type: 'job' | 'user'
          reported_id: string
          reason: string
          status: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reporter_user_id: string
          reported_type: 'job' | 'user'
          reported_id: string
          reason: string
          status?: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reporter_user_id?: string
          reported_type?: 'job' | 'user'
          reported_id?: string
          reason?: string
          status?: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          value: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

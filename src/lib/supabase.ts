import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Debug logging for deployment issues
console.log('Supabase config:', {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
  key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
  env: process.env.NODE_ENV
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-client-info': 'pamet-voting@1.0.0'
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
})

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
      voter_profiles: {
        Row: {
          id: string
          user_id: string | null
          email: string
          first_name: string
          last_name: string
          member_id: string | null
          is_admin: boolean
          has_voted: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          email: string
          first_name: string
          last_name: string
          member_id?: string | null
          is_admin?: boolean
          has_voted?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          email?: string
          first_name?: string
          last_name?: string
          member_id?: string | null
          is_admin?: boolean
          has_voted?: boolean
          created_at?: string
        }
      }
      positions: {
        Row: {
          id: string
          title: string
          description: string | null
          order_index: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          order_index: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          order_index?: number
          is_active?: boolean
          created_at?: string
        }
      }
      candidates: {
        Row: {
          id: string
          position_id: string
          first_name: string
          last_name: string
          platform: string | null
          photo_url: string | null
          vote_count: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          position_id: string
          first_name: string
          last_name: string
          platform?: string | null
          photo_url?: string | null
          vote_count?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          position_id?: string
          first_name?: string
          last_name?: string
          platform?: string | null
          photo_url?: string | null
          vote_count?: number
          is_active?: boolean
          created_at?: string
        }
      }
      election_votes: {
        Row: {
          id: string
          voter_id: string
          position_id: string
          candidate_id: string
          created_at: string
        }
        Insert: {
          id?: string
          voter_id: string
          position_id: string
          candidate_id: string
          created_at?: string
        }
        Update: {
          id?: string
          voter_id?: string
          position_id?: string
          candidate_id?: string
          created_at?: string
        }
      }
      election_settings: {
        Row: {
          id: string
          is_voting_open: boolean
          voting_start_time: string | null
          voting_end_time: string | null
          election_title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          is_voting_open?: boolean
          voting_start_time?: string | null
          voting_end_time?: string | null
          election_title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          is_voting_open?: boolean
          voting_start_time?: string | null
          voting_end_time?: string | null
          election_title?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_candidate_vote_count: {
        Args: {
          candidate_id: string
        }
        Returns: undefined
      }
      mark_voter_as_voted: {
        Args: {
          voter_id: string
        }
        Returns: undefined
      }
      create_voter_account: {
        Args: {
          voter_email: string
          voter_password: string
          voter_first_name: string
          voter_last_name: string
          voter_member_id?: string
          make_admin?: boolean
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 認証関連の型定義
export interface User {
  id: string
  email?: string
  user_metadata?: {
    display_name?: string
    avatar_url?: string
  }
}

export interface AuthState {
  user: User | null
  loading: boolean
}

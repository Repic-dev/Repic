/**
 * プロジェクト全体の型定義
 */

// ===== 認証関連 =====
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

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
}

// ===== UI関連 =====
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
}

export interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
}

export interface GenerationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  image: ImageMeta | null
}

// ===== アプリケーション関連 =====
export interface SearchResult {
  id: string
  userId?: string | null
  imageUrl: string
  prompt: string
  similarity: number
  createdAt?: string
  profileId?: string | null
  displayName?: string | null
}

export interface ImageMeta {
  id: string
  url: string
  prompt: string
}

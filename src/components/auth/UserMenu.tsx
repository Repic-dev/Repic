'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    try {
      const { error } = await signOut()
      if (error) {
        toast({
          title: 'エラー',
          description: 'ログアウトに失敗しました。',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'ログアウト完了',
          description: 'ログアウトしました。',
          variant: 'success',
        })
      }
    } catch (error) {
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました。',
        variant: 'destructive',
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (!user) return null

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'ユーザー'

  return (
    <div className="flex items-center gap-3">
      {/* ユーザー情報 */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-white">{displayName}</p>
          {user.email && (
            <p className="text-xs text-gray-300">{user.email}</p>
          )}
        </div>
      </div>

      {/* ログアウトボタン */}
      <Button
        onClick={handleSignOut}
        disabled={isLoggingOut}
        variant="outline"
        size="sm"
        className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:border-white/30"
      >
        <LogOut className="h-4 w-4 mr-2" />
        {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
      </Button>
    </div>
  )
}

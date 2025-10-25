'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'signin' | 'signup'
}

export function AuthDialog({ open, onOpenChange, mode: initialMode }: AuthDialogProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const { signIn, signUp, resetPassword } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let error

      if (mode === 'signin') {
        const result = await signIn(email, password)
        error = result.error
        if (!error) {
          toast({
            title: 'ログイン成功',
            description: 'ようこそ！',
            variant: 'success',
          })
          onOpenChange(false)
        }
      } else if (mode === 'signup') {
        const result = await signUp(email, password, displayName)
        error = result.error
        if (!error) {
          toast({
            title: 'アカウント作成完了',
            description: '確認メールを送信しました。メールを確認してください。',
            variant: 'success',
          })
          setMode('signin')
        }
      } else if (mode === 'reset') {
        const result = await resetPassword(email)
        error = result.error
        if (!error) {
          toast({
            title: 'パスワードリセット',
            description: 'パスワードリセット用のメールを送信しました。',
            variant: 'success',
          })
          setMode('signin')
        }
      }

      if (error) {
        toast({
          title: 'エラー',
          description: getAuthErrorMessage(error, mode === 'signup' ? 'signup' : mode === 'reset' ? 'reset' : 'signin'),
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました。',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setDisplayName('')
    setShowPassword(false)
  }

  const switchMode = (newMode: 'signin' | 'signup' | 'reset') => {
    setMode(newMode)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {mode === 'signin' && 'ログイン'}
            {mode === 'signup' && 'アカウント作成'}
            {mode === 'reset' && 'パスワードリセット'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">
                表示名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="表示名を入力"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              メールアドレス
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレスを入力"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワードを入力"
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white"
            disabled={loading}
          >
            {loading ? '処理中...' : (
              <>
                {mode === 'signin' && 'ログイン'}
                {mode === 'signup' && 'アカウント作成'}
                {mode === 'reset' && 'リセットメール送信'}
              </>
            )}
          </Button>
        </form>

        <div className="text-center space-y-2">
          {mode === 'signin' && (
            <>
              <button
                onClick={() => switchMode('reset')}
                className="text-sm text-green-600 hover:text-green-700"
              >
                パスワードを忘れた場合
              </button>
              <div className="text-sm text-gray-600">
                アカウントをお持ちでない方は{' '}
                <button
                  onClick={() => switchMode('signup')}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  こちらから作成
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <div className="text-sm text-gray-600">
              既にアカウントをお持ちの方は{' '}
              <button
                onClick={() => switchMode('signin')}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                こちらからログイン
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <div className="text-sm text-gray-600">
              <button
                onClick={() => switchMode('signin')}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                ログインに戻る
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

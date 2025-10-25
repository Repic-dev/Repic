'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import { Toaster } from '@/components/ui/toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  
  const { user, signIn, loading: authLoading } = useAuth()
  const { toast, toasts, dismiss } = useToast()
  const router = useRouter()

  // 既にログインしている場合はリダイレクト
  useEffect(() => {
    if (user && !authLoading && !isRedirecting) {
      setIsRedirecting(true)
      router.push('/')
    }
  }, [user, authLoading, router, isRedirecting])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      
      if (error) {
        console.error('ログインエラー詳細:', {
          message: error.message,
          name: error.name,
          status: error.status
        })
        
        const errorMessage = getAuthErrorMessage(error, 'signin')
        
        // エラートーストを確実に表示
        toast({
          title: 'ログインエラー',
          description: errorMessage,
          variant: 'destructive',
        })
        setLoading(false)
        return // 早期リターンで処理を終了
      }
      
      // ログイン成功の場合
      toast({
        title: 'ログイン成功',
        description: 'ようこそ！',
        variant: 'success',
      })
      // 認証状態の更新を待つため、リダイレクトはuseEffectで処理
      // ここではローディング状態を維持
      
    } catch (error: any) {
      console.error('ログイン処理で例外発生:', error)
      
      // すべてのエラーをキャッチして表示
      const errorMessage = getAuthErrorMessage(error, 'signin')
      toast({
        title: 'ログインエラー',
        description: errorMessage,
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  if (isRedirecting || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 opacity-30 blur-xl animate-pulse" />
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-500 border-r-emerald-400 animate-spin" />
              <div className="absolute inset-3 rounded-full bg-white dark:bg-gray-900" />
            </div>
          </div>
          <div className="mt-6 text-gray-600 dark:text-gray-300 text-sm font-medium">
            {isRedirecting ? 'リダイレクト中...' : 'ログイン中...'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">

        {/* ロゴ */}
        <div className="flex justify-center mb-8">
          <div className="bg-black p-4 rounded-lg">
            <Image
              src="/repicLogo.png"
              alt="Repic"
              width={150}
              height={40}
              className="object-contain"
            />
          </div>
        </div>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          アカウントをお持ちでない方は{' '}
          <Link
            href="/signup"
            className="font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
          >
            こちらから作成
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                メールアドレス
              </label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="メールアドレスを入力"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                パスワード
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="パスワードを入力"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  href="/reset-password"
                  className="font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
                >
                  パスワードを忘れた場合
                </Link>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  または
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                アカウントをお持ちでない方は{' '}
                <Link
                  href="/signup"
                  className="font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
                >
                  新規登録
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

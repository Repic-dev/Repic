'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [isCheckingToken, setIsCheckingToken] = useState(true)
  
  const { toast } = useToast()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsValidToken(true)
        } else {
          // URLパラメータからトークンを確認
          const accessToken = searchParams.get('access_token')
          const refreshToken = searchParams.get('refresh_token')
          
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            
            if (!error) {
              setIsValidToken(true)
            }
          }
        }
      } catch (error) {
        console.error('Token validation error:', error)
      } finally {
        setIsCheckingToken(false)
      }
    }

    checkSession()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast({
        title: 'エラー',
        description: 'パスワードが一致しません。',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: 'エラー',
        description: 'パスワードは6文字以上で入力してください。',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        toast({
          title: 'エラー',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        setIsSuccess(true)
        toast({
          title: 'パスワード更新完了',
          description: 'パスワードが正常に更新されました。',
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
      setLoading(false)
    }
  }

  if (isCheckingToken) {
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
            トークンを確認中...
          </div>
        </div>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center mb-8">
            <Image
              src="/repicLogo.png"
              alt="Repic"
              width={150}
              height={40}
              className="object-contain"
            />
          </div>
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                無効なリンク
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                このリンクは無効または期限切れです。
              </p>
              <Link
                href="/reset-password"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                新しいリセットリンクをリクエスト
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center mb-8">
            <Image
              src="/repicLogo.png"
              alt="Repic"
              width={150}
              height={40}
              className="object-contain"
            />
          </div>
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
                パスワード更新完了
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                パスワードが正常に更新されました。
              </p>
              <div className="mt-6">
                <Link
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  ログインページに移動
                </Link>
              </div>
            </div>
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

        <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
          新しいパスワードを設定
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          新しいパスワードを入力してください。
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                新しいパスワード
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="新しいパスワードを入力（6文字以上）"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                パスワード確認
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="パスワードを再入力"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '更新中...' : 'パスワードを更新'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
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
            読み込み中...
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}

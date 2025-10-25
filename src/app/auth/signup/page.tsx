'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { getAuthErrorMessage } from '@/lib/auth-errors'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  
  const { user, signUp } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // 既にログインしている場合はリダイレクト
  useEffect(() => {
    if (user && !isRedirecting) {
      setIsRedirecting(true)
      router.push('/')
    }
  }, [user, router, isRedirecting])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // パスワード確認
    if (password !== confirmPassword) {
      toast({
        title: 'エラー',
        description: 'パスワードが一致しません。',
        variant: 'destructive',
      })
      return
    }

    // パスワード強度チェック
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
      const { error } = await signUp(email, password, displayName)
      
      if (error) {
        const errorMessage = getAuthErrorMessage(error, 'signup')
        
        toast({
          title: 'アカウント作成エラー',
          description: errorMessage,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'アカウント作成完了',
          description: '確認メールを送信しました。メールを確認してください。',
          variant: 'success',
        })
        router.push('/login')
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

  if (isRedirecting) {
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
            リダイレクト中...
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
          アカウント作成
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          既にアカウントをお持ちの方は{' '}
          <Link
            href="/login"
            className="font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
          >
            こちらからログイン
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                表示名
              </label>
              <div className="mt-1 relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="表示名を入力"
                />
              </div>
            </div>

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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="パスワードを入力（6文字以上）"
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
                {loading ? 'アカウント作成中...' : 'アカウント作成'}
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
                既にアカウントをお持ちの方は{' '}
                <Link
                  href="/login"
                  className="font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
                >
                  ログイン
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

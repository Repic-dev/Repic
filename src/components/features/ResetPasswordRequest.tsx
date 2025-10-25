'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export function ResetPasswordRequest() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  
  const { resetPassword } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await resetPassword(email)
      
      if (error) {
        toast({
          title: 'エラー',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        setEmailSent(true)
        toast({
          title: 'メール送信完了',
          description: 'パスワードリセット用のメールを送信しました。',
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

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* 戻るボタン */}
          <div className="mb-6">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              ログインページに戻る
            </Link>
          </div>

          {/* ロゴ */}
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
                メール送信完了
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                パスワードリセット用のメールを <strong>{email}</strong> に送信しました。
              </p>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                メール内のリンクをクリックして、新しいパスワードを設定してください。
              </p>
              <div className="mt-6">
                <Link
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  ログインページに戻る
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
          パスワードリセット
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          登録されているメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
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
              <Button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '送信中...' : 'リセットメールを送信'}
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
                パスワードを思い出した方は{' '}
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

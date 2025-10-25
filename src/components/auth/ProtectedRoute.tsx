'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthDialog } from './AuthDialog'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
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
            認証状態を確認中
            <span className="inline-flex w-8 justify-start ml-1">
              <span className="animate-bounce">.</span>
              <span className="animate-bounce [animation-delay:150ms]">.</span>
              <span className="animate-bounce [animation-delay:300ms]">.</span>
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            ログインが必要です
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            この機能を使用するにはログインしてください
          </p>
          <AuthDialog open={true} onOpenChange={() => {}} mode="signin" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}

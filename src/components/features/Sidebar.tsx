'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, LogOut, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SITUATIONS } from '@/constants';

interface SidebarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: () => void;
  onGenerate: () => void;
  isSearching: boolean;
  isGenerating: boolean;
  userProfile: { display_name: string } | null;
  user: any;
  isLoggingOut: boolean;
  onLogout: () => void;
}

export function Sidebar({
  searchQuery,
  setSearchQuery,
  onSearch,
  onGenerate,
  isSearching,
  isGenerating,
  userProfile,
  user,
  isLoggingOut,
  onLogout,
}: SidebarProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <aside className='w-[420px] bg-black text-white flex flex-col'>
      <div className='p-8'>
        <div className='mb-8'>
          <Image
            src='/repicLogo.png'
            alt='Repic'
            width={150}
            height={40}
            className='object-contain'
          />
        </div>

        <div className='space-y-6'>
          <h2 className='text-lg font-medium'>Get inspired !</h2>

          <div className='bg-white rounded-2xl p-6 space-y-4'>
            <textarea
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 200) + 'px';
              }}
              placeholder='✨ キーワードを入力'
              className='w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all resize-none overflow-hidden min-h-[48px] max-h-[200px]'
              disabled={isSearching || isGenerating}
              rows={1}
            />

            <div>
              <h3 className='text-sm text-gray-500 mb-2'>目的から探す</h3>
              <div className='flex flex-wrap gap-2'>
                {SITUATIONS.map((text) => (
                  <Button
                    key={text}
                    variant='secondary'
                    size='sm'
                    className='rounded-full'
                    onClick={() => setSearchQuery(text)}
                  >
                    {text}
                  </Button>
                ))}
              </div>
            </div>

            <div className='flex gap-3'>
              <button
                onClick={onGenerate}
                disabled={!searchQuery.trim() || isGenerating}
                className='flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium text-base rounded-full transition-colors'
              >
                {isGenerating ? '生成中...' : '新規生成'}
              </button>

              <button
                onClick={onSearch}
                disabled={isSearching || isGenerating || !searchQuery.trim()}
                className='flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium text-base rounded-full transition-colors border-2 border-transparent'
              >
                {isSearching ? (
                  '検索中...'
                ) : (
                  <>
                    <Search className='h-4 w-4' />
                    検索
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ユーザー情報とメニュー */}
      <div className='mt-auto p-8 border-t border-gray-800'>
        {user && userProfile ? (
          <div className='relative' ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className='flex items-center gap-3 w-full hover:opacity-80 transition-opacity'
            >
              <div className='w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center'>
                <User className='h-5 w-5 text-white' />
              </div>
              <div className='flex-1 text-left'>
                <p className='text-white font-medium'>
                  {userProfile.display_name}
                </p>
                <p className='text-gray-400 text-sm'>{user.email}</p>
              </div>
            </button>

            {/* ドロップダウンメニュー */}
            {isMenuOpen && (
              <div className='absolute bottom-full left-0 mb-2 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-50'>
                <button
                  onClick={() => {
                    router.push('/mypage');
                    setIsMenuOpen(false);
                  }}
                  className='w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 transition-colors text-left'
                >
                  <User className='h-4 w-4' />
                  <span>マイページ</span>
                </button>
                <button
                  onClick={() => {
                    onLogout();
                    setIsMenuOpen(false);
                  }}
                  disabled={isLoggingOut}
                  className='w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isLoggingOut ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <LogOut className='h-4 w-4' />
                  )}
                  <span>{isLoggingOut ? 'ログアウト中...' : 'ログアウト'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className='flex items-center justify-end'>
            <Button
              onClick={() => router.push('/login')}
              variant='outline'
              size='sm'
              className='bg-transparent border-white/20 text-white hover:bg-white/20 hover:border-white/40 hover:text-white'
            >
              <User className='h-4 w-4 mr-2' />
              ログイン
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { GenerationDialog } from '@/components/ui/generation-dialog';
import { Toaster } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import type { ImageMeta } from '@/app/api';
import { Search, ThumbsUp, ThumbsDown, Copy as CopyIcon, Check, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  userId?: string | null;
  imageUrl: string;
  prompt: string;
  similarity: number;
  createdAt?: string;
  profileId?: string | null;
  displayName?: string | null;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<ImageMeta | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [userProfile, setUserProfile] = useState<{ display_name: string } | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { toast, toasts, dismiss } = useToast();
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      setIsCheckingAuth(false);
      if (!user) {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
            const { data, error } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .maybeSingle(); 
          if (error) {
            console.error('プロファイル取得エラー:', error);
            const fallbackName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'ユーザー';
            setUserProfile({ display_name: fallbackName });
          } else if (data) {
            setUserProfile(data);
          } else {
            const fallbackName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'ユーザー';
            setUserProfile({ display_name: fallbackName });
          }
        } catch (error) {
          console.error('プロファイル取得エラー:', error);
          const fallbackName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'ユーザー';
          setUserProfile({ display_name: fallbackName });
        }
      } else {
        setUserProfile(null);
      }
    };

    fetchUserProfile();
  }, [user]);

  const situations = [
    '広告バナー',
    'アイキャッチ画像',
    'プレゼン資料',
    'Webサイト',
    'SNS投稿'
  ];
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setFallbackMessage(null);
    setHasSearched(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        if (data.message) {
          setFallbackMessage(data.message);
        }
      }
    } catch (error) {
      console.error('検索エラー:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerate = async () => {
    if (!searchQuery.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: searchQuery }),
      });

      if (response.ok) {
        const data = await response.json();
        
        
        const imageId = Date.now().toString();
        const newResult: SearchResult = {
          id: imageId,
          imageUrl: data.imageUrl,
          prompt: searchQuery,
          similarity: 1.0, 
        };
        setSearchResults(prev => [newResult, ...prev]);
        
        setGeneratedImage({
          id: imageId,
          url: data.imageUrl,
          prompt: searchQuery,
        });
        setIsDialogOpen(true);
      } else {
        const errorData = await response.json();
        console.error('画像生成エラー:', errorData.error);
        alert('画像の生成に失敗しました: ' + errorData.error);
      }
    } catch (error) {
      console.error('画像生成エラー:', error);
      alert('画像生成中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (result: SearchResult) => {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const fileName = `image-${timestamp}.png`;

      const downloadUrl = `/api/download?url=${encodeURIComponent(result.imageUrl)}&filename=${encodeURIComponent(fileName)}`;

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('ダウンロードに失敗しました');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: 'ダウンロード完了',
        description: '画像のダウンロードが完了しました',
        variant: 'success',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'エラー',
        description: 'ダウンロードに失敗しました。',
        variant: 'destructive',
      });
    }
  };

  const handleCopy = async (result: SearchResult) => {
    try {
      await navigator.clipboard.writeText(result.prompt);
      setCopiedId(result.id);
      

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (error) {
      console.error('コピーエラー:', error);
    }
  };

  const handleLike = (result: SearchResult) => {
  };

  const handleDislike = (result: SearchResult) => {
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await signOut();
      if (error) {
        toast({
          title: 'エラー',
          description: 'ログアウトに失敗しました。',
          variant: 'destructive',
        });
        setIsLoggingOut(false);
      } else {
        toast({
          title: 'ログアウト完了',
          description: 'ログアウトしました。',
          variant: 'success',
        });
        router.push('/login');
      }
    } catch (error) {
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました。',
        variant: 'destructive',
      });
      setIsLoggingOut(false);
    }
  };

  if (isCheckingAuth || authLoading || !user || isLoggingOut) {
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
            {isLoggingOut ? 'ログアウト中' : 
             isCheckingAuth || authLoading ? '認証状態を確認中' : 'ログインが必要です'}
            <span className="inline-flex w-8 justify-start ml-1">
              <span className="animate-bounce">.</span>
              <span className="animate-bounce [animation-delay:150ms]">.</span>
              <span className="animate-bounce [animation-delay:300ms]">.</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 左側サイドバー */}
      <aside className="w-[420px] bg-black text-white flex flex-col">
        <div className="p-8">
          <div className="mb-8">
            <Image
              src="/repicLogo.png"
              alt="Repic"
              width={150}
              height={40}
              className="object-contain"
            />
          </div>


          <div className="space-y-6">
            <h2 className="text-lg font-medium">Get inspired !</h2>

              <div className="bg-white rounded-2xl p-6 space-y-4">
                <textarea
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                  }}
                  placeholder="✨ キーワードを入力"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all resize-none overflow-hidden min-h-[48px] max-h-[200px]"
                  disabled={isSearching || isGenerating}
                  rows={1}
                />

                <div>
                  <h3 className="text-sm text-gray-500 mb-2">目的から探す</h3>
                  <div className="flex flex-wrap gap-2">
                    {situations.map((text) => (
                      <Button
                        key={text}
                        variant="secondary"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setSearchQuery(text)}
                      >
                        {text}
                      </Button>
                    ))}
                  </div>
                </div>

              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={!searchQuery.trim() || isGenerating}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium text-base rounded-full transition-colors"
                >
                  {isGenerating ? '生成中...' : '新規生成'}
                </button>

                <button
                  onClick={handleSearch}
                  disabled={isSearching || isGenerating || !searchQuery.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium text-base rounded-full transition-colors border-2 border-transparent"
                >
                  {isSearching ? (
                    '検索中...'
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      検索
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ユーザー情報とログアウト */}
        {user && userProfile && (
          <div className="mt-auto p-8 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">{userProfile.display_name}</p>
                  <p className="text-gray-400 text-sm">{user.email}</p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                variant="outline"
                size="sm"
                className="bg-transparent border-white/20 text-white hover:bg-white/20 hover:border-white/40 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* 右側コンテンツエリア */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* ローディングインジケーター */}
          {(isSearching || isGenerating) && (
            <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
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
                  {isGenerating ? '画像を生成中' : '検索中'}
                  <span className="inline-flex w-8 justify-start ml-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce [animation-delay:150ms]">.</span>
                    <span className="animate-bounce [animation-delay:300ms]">.</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* フォールバックメッセージ */}
          {fallbackMessage && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                  {fallbackMessage}
                </p>
              </div>
            </div>
          )}

          {/* 検索結果 */}
          {!isSearching && !isGenerating && searchResults.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="group bg-white dark:bg-gray-800 rounded-3xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-gray-700"
                >
                  {/* 画像エリア */}
                  <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                    <Image
                      src={result.imageUrl}
                      alt="検索結果の画像"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* グラデーションオーバーレイ */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* ダウンロードボタン */}
                    <button
                      onClick={() => handleDownload(result)}
                      className="absolute bottom-4 right-4 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 backdrop-blur-sm"
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 3V13M10 13L6 9M10 13L14 9M3 17H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>

                  {/* コンテンツエリア */}
                  <div className="p-6">
                    {/* ユーザー情報 */}
                    {result.profileId && result.displayName && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {result.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-black text-sm">
                          generated by {result.displayName}
                        </p>
                      </div>
                    )}

                    {/* プロンプト */}
                    <div className="mt-4 pt-4 mb-6 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-black uppercase tracking-wide">
                            生成プロンプト
                          </h3>
                          <Button
                            onClick={() => handleCopy(result)}
                            variant="outline"
                            size="icon"
                            className={`h-8 w-8 rounded-full transition-all duration-200 ${
                              copiedId === result.id
                                ? 'border-green-500 bg-green-50 text-green-600 dark:bg-green-900/20 scale-105'
                                : 'hover:bg-gray-50 hover:border-gray-300'
                            }`}
                            title={copiedId === result.id ? 'コピーしました！' : 'プロンプトをコピー'}
                          >
                            {copiedId === result.id ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <CopyIcon className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => handleLike(result)}
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-green-50 hover:border-green-500 hover:text-green-600 dark:hover:bg-green-900/20 transition-all duration-200"
                            title="いいね"
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => handleDislike(result)}
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-red-50 hover:border-red-500 hover:text-red-600 dark:hover:bg-red-900/20 transition-all duration-200"
                            title="良くない"
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-gray-500 dark:text-gray-200 leading-relaxed text-sm line-clamp-3">
                        {result.prompt}
                      </p>
                      
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 検索結果なし */}
          {!isSearching && !isGenerating && searchResults.length === 0 && hasSearched && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-gray-400 mb-4">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="11" cy="11" r="8" strokeWidth="2"/>
                  <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                検索結果が見つかりませんでした。
              </p>
            </div>
          )}

          {/* 初期状態 */}
          {!hasSearched && !isSearching && !isGenerating && searchResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-gray-300 mb-6">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="11" cy="11" r="8" strokeWidth="2"/>
                  <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-gray-400 text-lg">
                キーワードを入力して検索を開始してください。
              </p>
            </div>
          )}
        </div>
      </main>

      <GenerationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        image={generatedImage}
      />


      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

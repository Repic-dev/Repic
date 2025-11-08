'use client';

import { useState, useEffect } from 'react';
import { GenerationDialog } from '@/components/ui/generationModal';
import { Toaster } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { FallbackMessage } from '@/components/ui/FallbackMessage';
import { Sidebar } from '@/components/features/Sidebar';
import { SearchResults } from '@/components/features/SearchResults';
import { useToast } from '@/usecases/useToast';
import type { ImageMeta } from '@/app/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/libs/supabase';
import { useRouter } from 'next/navigation';
import type { SearchResult } from '@/types/types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, Copy, Check } from 'lucide-react';


export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<ImageMeta | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSearchResult, setSelectedSearchResult] = useState<SearchResult | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copiedHistoryIndex, setCopiedHistoryIndex] = useState<number | null>(null);
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
          promptHistory: [{
            prompt: searchQuery,
            timestamp: new Date().toISOString()
          }]
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
        setIsLoggingOut(false);
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

  if (isCheckingAuth || authLoading || isLoggingOut) {
    return (
      <LoadingSpinner 
        message={isLoggingOut ? 'ログアウト中' : '認証状態を確認中'} 
        isFullScreen={true} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        onGenerate={handleGenerate}
        isSearching={isSearching}
        isGenerating={isGenerating}
        userProfile={userProfile}
        user={user}
        isLoggingOut={isLoggingOut}
        onLogout={handleLogout}
      />

      {/* 右側コンテンツエリア */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* ローディングインジケーター */}
          {(isSearching || isGenerating) && (
            <LoadingSpinner message={isGenerating ? '画像を生成中' : '検索中'} />
          )}

          {/* フォールバックメッセージ */}
          {fallbackMessage && (
            <FallbackMessage message={fallbackMessage} />
          )}

          {/* 検索結果 */}
          {!isSearching && !isGenerating && searchResults.length > 0 && (
            <SearchResults
              results={searchResults}
              copiedId={copiedId}
              onDownload={handleDownload}
              onCopy={handleCopy}
              onLike={handleLike}
              onDislike={handleDislike}
              onImageClick={setSelectedSearchResult}
            />
          )}

          {/* 検索結果なし */}
          {!isSearching && !isGenerating && searchResults.length === 0 && hasSearched && (
            <EmptyState type="no-results" />
          )}

          {/* 初期状態 */}
          {!hasSearched && !isSearching && !isGenerating && searchResults.length === 0 && (
            <EmptyState type="initial" />
          )}
        </div>
      </main>

      <GenerationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        image={generatedImage}
        onImageUpdate={(newImage) => {
          setGeneratedImage(newImage)
          const newResult: SearchResult = {
            id: newImage.id,
            imageUrl: newImage.url,
            prompt: newImage.prompt,
            similarity: 1.0,
          }
          setSearchResults(prev => [newResult, ...prev])
        }}
      />

      {/* 検索結果用モーダル */}
      {selectedSearchResult && (
        <Dialog open={!!selectedSearchResult} onOpenChange={() => setSelectedSearchResult(null)}>
          <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-card border-border'>
            <div className='grid md:grid-cols-[1fr,360px] gap-0'>
              <div className='relative bg-black flex items-center justify-center min-h-[240px] md:min-h-[400px]'>
                <img
                  src={selectedSearchResult.imageUrl || '/placeholder.svg'}
                  alt={selectedSearchResult.prompt}
                  className='max-h-[70vh] w-auto h-auto object-contain'
                />
              </div>

              <div className='p-6 space-y-6'>
                <div className='flex items-start justify-between'>
                  <DialogTitle className='text-lg font-semibold text-balance leading-relaxed'>
                    詳細
                  </DialogTitle>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => setSelectedSearchResult(null)}
                    className='h-8 w-8 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    aria-label='閉じる'
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>

                <div className='space-y-4'>
                  <div>
                    <div className='flex items-center justify-between mb-2'>
                      <label className='text-sm font-medium text-muted-foreground'>
                        プロンプト
                      </label>
                      <Button
                        variant='outline'
                        size='icon'
                        className={`h-8 w-8 ${
                          copiedPromptId === selectedSearchResult.id
                            ? 'border-green-500 bg-green-50 text-green-600 dark:bg-green-900/20'
                            : ''
                        }`}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(selectedSearchResult.prompt);
                            setCopiedPromptId(selectedSearchResult.id);
                            toast({
                              title: 'コピーしました',
                              description: 'プロンプトをクリップボードにコピーしました',
                              variant: 'success',
                            });
                            setTimeout(() => setCopiedPromptId(null), 2000);
                          } catch (e) {
                            toast({
                              title: 'コピーに失敗',
                              description: 'クリップボードへのアクセスに失敗しました',
                              variant: 'destructive',
                            });
                          }
                        }}
                        aria-label='プロンプトをコピー'
                      >
                        {copiedPromptId === selectedSearchResult.id ? (
                          <Check className='h-4 w-4' />
                        ) : (
                          <Copy className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                    <p className='mt-2 text-sm leading-relaxed'>{selectedSearchResult.prompt}</p>
                  </div>

                  {selectedSearchResult.promptHistory && selectedSearchResult.promptHistory.length > 0 && (
                    <div>
                      <label className='text-sm font-medium text-muted-foreground mb-2 block'>
                        プロンプト履歴
                      </label>
                      <div className='mt-2 space-y-2 max-h-48 overflow-y-auto'>
                        {selectedSearchResult.promptHistory.map((item, index) => (
                          <div
                            key={index}
                            className='p-3 bg-muted/30 rounded-md border border-border'
                          >
                            <div className='flex items-center justify-between mb-1'>
                              <span className='text-xs text-muted-foreground'>
                                {index + 1}回目
                              </span>
                              <Button
                                variant='ghost'
                                size='icon'
                                className={`h-6 w-6 ${
                                  copiedHistoryIndex === index
                                    ? 'border-green-500 bg-green-50 text-green-600 dark:bg-green-900/20'
                                    : ''
                                }`}
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(item.prompt);
                                    setCopiedHistoryIndex(index);
                                    toast({
                                      title: 'コピーしました',
                                      description: 'プロンプトをクリップボードにコピーしました',
                                      variant: 'success',
                                    });
                                    setTimeout(() => setCopiedHistoryIndex(null), 2000);
                                  } catch (e) {
                                    toast({
                                      title: 'コピーに失敗',
                                      description: 'クリップボードへのアクセスに失敗しました',
                                      variant: 'destructive',
                                    });
                                  }
                                }}
                                aria-label='プロンプトをコピー'
                              >
                                {copiedHistoryIndex === index ? (
                                  <Check className='h-3 w-3' />
                                ) : (
                                  <Copy className='h-3 w-3' />
                                )}
                              </Button>
                            </div>
                            <p className='text-sm leading-relaxed'>{item.prompt}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      className='flex-1 bg-transparent'
                      aria-label='画像をダウンロード'
                      onClick={() => handleDownload(selectedSearchResult)}
                    >
                      <Download className='h-4 w-4 mr-2' />
                      ダウンロード
                    </Button>
                  </div>
                </div>

                <div className='pt-4 border-t border-border space-y-3'>
                  <h4 className='text-sm font-medium'>生成情報</h4>
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>モデル</span>
                      <span>DALL-E 3</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>サイズ</span>
                      <span>1024 × 1024</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>スタイル</span>
                      <span>Vivid</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

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
      />

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageGallery } from '@/components/ui/imageGallery';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from '@/components/ui/dialog';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/libs/supabase';

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface FollowedUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

function UserProfileContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get('userId');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [imageCount, setImageCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isFollowListOpen, setIsFollowListOpen] = useState(false);
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([]);
  const [loadingFollows, setLoadingFollows] = useState(false);

  // 表示するユーザーIDを決定（URLパラメータがあればそれを使用、なければログインユーザー）
  const targetUserId = userIdParam || user?.id;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      try {
        // プロフィール情報を取得
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, bio')
          .eq('id', targetUserId)
          .maybeSingle();

        if (profileError) {
          console.error('プロファイル取得エラー:', profileError);
        }

        if (profileData) {
          setProfile(profileData);
        } else {
          // プロファイルが存在しない場合のフォールバック
          setProfile({
            display_name: 'ユーザー',
            avatar_url: null,
            bio: null,
          });
        }

        // 作品数を取得
        const { count, error: countError } = await supabase
          .from('images')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', targetUserId);

        if (countError) {
          console.error('作品数取得エラー:', countError);
        } else {
          setImageCount(count || 0);
        }
      } catch (error) {
        console.error('データ取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchProfile();
    }
  }, [targetUserId, authLoading]);

  // デフォルトのアバター初期文字を取得
  const getAvatarInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  // 表示名を取得
  const getDisplayName = () => {
    if (profile?.display_name) {
      return profile.display_name;
    }
    return 'ユーザー';
  };

  // 自分のマイページかどうかを判定
  const isOwnProfile = targetUserId === user?.id;

  // フォロー一覧を取得
  const fetchFollowedUsers = async () => {
    if (!user?.id) return;

    setLoadingFollows(true);
    try {
      // フォローテーブルが存在する場合の実装
      // 現時点では空の配列を返す（後で実装可能）
      // const { data, error } = await supabase
      //   .from('follows')
      //   .select('followed_id, profiles!follows_followed_id_fkey(id, display_name, avatar_url)')
      //   .eq('follower_id', user.id);

      // 仮の実装：後でフォローテーブルが追加されたら実装
      setFollowedUsers([]);
    } catch (error) {
      console.error('フォロー一覧取得エラー:', error);
      setFollowedUsers([]);
    } finally {
      setLoadingFollows(false);
    }
  };

  // フォロー一覧モーダルを開く
  const handleOpenFollowList = () => {
    setIsFollowListOpen(true);
    fetchFollowedUsers();
  };

  if (authLoading || loading) {
    return (
      <div className='min-h-screen bg-black text-white flex items-center justify-center'>
        <div className='text-muted-foreground'>読み込み中...</div>
      </div>
    );
  }

  // URLパラメータでユーザーIDが指定されている場合は、ログイン不要
  if (!userIdParam && !user) {
    return (
      <div className='min-h-screen bg-black text-white flex items-center justify-center'>
        <div className='text-muted-foreground'>ログインが必要です</div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-black text-white'>
      {/* Logo (same as top page) */}
      <div className='w-full py-6 flex justify-start'>
        <Link
          href='/'
          className='cursor-pointer hover:opacity-80 transition-opacity'
        >
          <Image
            src='/repicLogo.png'
            alt='Repic'
            width={150}
            height={40}
            className='object-contain'
          />
        </Link>
      </div>

      {/* Profile Section */}
      <div className='max-w-6xl mx-auto py-8'>
        <div className='flex flex-col md:flex-row gap-8 items-start mb-8'>
          <Avatar className='h-24 w-24 md:h-32 md:w-32 border-2 border-primary/20'>
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className='text-2xl bg-primary/10 text-primary'>
              {getAvatarInitials()}
            </AvatarFallback>
          </Avatar>

          <div className='flex-1 space-y-4'>
            <div>
              <h1 className='text-3xl md:text-4xl font-bold mb-2 text-balance'>
                {getDisplayName()}
              </h1>
              {profile?.bio && (
                <p className='text-muted-foreground text-lg leading-relaxed'>
                  {profile.bio}
                </p>
              )}
            </div>

            <div className='flex flex-wrap gap-6 text-sm'>
              <div className='flex items-center gap-2'>
                <div className='h-2 w-2 rounded-full bg-primary' />
                <span className='text-muted-foreground'>{`${imageCount} 作品`}</span>
              </div>
            </div>

            <div className='flex gap-3 [&>button:nth-child(2)]:hidden'>
              {isOwnProfile ? (
                <Button
                  className='bg-primary hover:bg-primary/90'
                  onClick={handleOpenFollowList}
                >
                  {'フォロー中のユーザー'}
                </Button>
              ) : (
                <>
                  <Button className='bg-primary hover:bg-primary/90'>
                    {'フォロー'}
                  </Button>
                  <Button variant='outline'>{'メッセージ'}</Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue='gallery' className='w-full'>
          <TabsList className='w-full md:w-auto mb-8 bg-card border border-border'>
            <TabsTrigger value='gallery' className='flex-1 md:flex-none'>
              {'ギャラリー'}
            </TabsTrigger>
            <TabsTrigger value='liked' className='flex-1 md:flex-none'>
              {'いいね'}
            </TabsTrigger>
            <TabsTrigger value='collections' className='hidden'>
              {'コレクション'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value='gallery' className='mt-0'>
            <ImageGallery userId={targetUserId} />
          </TabsContent>

          <TabsContent value='liked' className='mt-0'>
            <div className='text-center py-16 text-muted-foreground'>
              {'いいねした作品がここに表示されます'}
            </div>
          </TabsContent>

          <TabsContent value='collections' className='hidden'>
            <div className='text-center py-16 text-muted-foreground'>
              {'コレクションがここに表示されます'}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* フォロー中のユーザーモーダル */}
      <Dialog open={isFollowListOpen} onOpenChange={setIsFollowListOpen}>
        <DialogContent className='max-w-md max-h-[80vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>フォロー中のユーザー</DialogTitle>
          </DialogHeader>
          <div className='mt-4 space-y-4'>
            {loadingFollows ? (
              <div className='text-center py-8 text-muted-foreground'>
                読み込み中...
              </div>
            ) : followedUsers.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                フォロー中のユーザーはいません
              </div>
            ) : (
              followedUsers.map((followedUser) => (
                <Link
                  key={followedUser.id}
                  href={`/mypage?userId=${followedUser.id}`}
                  className='flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors'
                  onClick={() => setIsFollowListOpen(false)}
                >
                  <Avatar className='h-10 w-10'>
                    <AvatarImage src={followedUser.avatar_url || undefined} />
                    <AvatarFallback className='bg-primary/10 text-primary'>
                      {followedUser.display_name?.slice(0, 2).toUpperCase() ||
                        'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className='flex-1'>
                    <p className='text-white font-medium'>
                      {followedUser.display_name || 'ユーザー'}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UserProfile() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen bg-black text-white flex items-center justify-center'>
          <div className='text-muted-foreground'>読み込み中...</div>
        </div>
      }
    >
      <UserProfileContent />
    </Suspense>
  );
}

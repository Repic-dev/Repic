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
import { useToast } from '@/usecases/useToast';

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
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const { toast } = useToast();

  const targetUserId = userIdParam || user?.id;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      try {
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
          setProfile({
            display_name: 'ユーザー',
            avatar_url: null,
            bio: null,
          });
        }

        const { count, error: countError } = await supabase
          .from('images')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', targetUserId);

        if (countError) {
          console.error('作品数取得エラー:', countError);
        } else {
          setImageCount(count || 0);
        }

        // フォロー状態とフォロワー数を取得
        await fetchFollowStatus();
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

  const fetchFollowStatus = async () => {
    if (!targetUserId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `/api/follow/status?userId=${targetUserId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.isFollowing);
        setFollowerCount(data.followerCount);
      }
    } catch (error) {
      console.error('フォロー状態取得エラー:', error);
    }
  };

  const getAvatarInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  // ユーザーIDに基づいて一意のグラデーション色を生成
  const getAvatarGradient = (userId: string | undefined) => {
    if (!userId) {
      return 'from-blue-500 to-purple-600';
    }
    
    // ユーザーIDの文字列から数値を生成して色を決定
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-orange-500 to-red-500',
      'from-green-500 to-emerald-500',
      'from-indigo-500 to-blue-500',
      'from-pink-500 to-rose-500',
      'from-teal-500 to-cyan-500',
      'from-amber-500 to-orange-500',
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  const getDisplayName = () => {
    if (profile?.display_name) {
      return profile.display_name;
    }
    return 'ユーザー';
  };

  const isOwnProfile = targetUserId === user?.id;

  const fetchFollowedUsers = async () => {
    if (!user?.id) return;

    setLoadingFollows(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setFollowedUsers([]);
        return;
      }

      const response = await fetch('/api/follow/list', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFollowedUsers(data.users || []);
      } else {
        console.error('フォロー一覧取得エラー');
        setFollowedUsers([]);
      }
    } catch (error) {
      console.error('フォロー一覧取得エラー:', error);
      setFollowedUsers([]);
    } finally {
      setLoadingFollows(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!user || !targetUserId || isTogglingFollow) return;
    if (targetUserId === user.id) return;

    setIsTogglingFollow(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'エラー',
          description: 'ログインが必要です',
          variant: 'destructive',
        });
        return;
      }

      const action = isFollowing ? 'unfollow' : 'follow';
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          followingId: targetUserId,
          action,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsFollowing(!isFollowing);
        // フォロワー数を更新
        await fetchFollowStatus();
        toast({
          title: '成功',
          description: data.message,
          variant: 'success',
        });
      } else {
        const errorData = await response.json();
        toast({
          title: 'エラー',
          description: errorData.error || 'フォロー操作に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('フォロー操作エラー:', error);
      toast({
        title: 'エラー',
        description: 'フォロー操作に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsTogglingFollow(false);
    }
  };

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

  if (!userIdParam && !user) {
    return (
      <div className='min-h-screen bg-black text-white flex items-center justify-center'>
        <div className='text-muted-foreground'>ログインが必要です</div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-black text-white'>
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

      <div className='max-w-6xl mx-auto py-8'>
        <div className='flex flex-col md:flex-row gap-8 items-start mb-8'>
          <Avatar className='h-24 w-24 md:h-32 md:w-32 border-2 border-primary/20'>
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(targetUserId)} text-white`}>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                className='h-12 w-12 md:h-16 md:w-16 opacity-90'
              >
                <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
                <circle cx='12' cy='7' r='4' />
              </svg>
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
              {!isOwnProfile && (
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full bg-primary' />
                  <span className='text-muted-foreground'>{`${followerCount} フォロワー`}</span>
                </div>
              )}
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
                  <Button
                    className={isFollowing ? 'bg-gray-600 hover:bg-gray-700' : 'bg-primary hover:bg-primary/90'}
                    onClick={handleToggleFollow}
                    disabled={isTogglingFollow}
                  >
                    {isTogglingFollow
                      ? '処理中...'
                      : isFollowing
                      ? 'フォロー中'
                      : 'フォロー'}
                  </Button>
                  <Button variant='outline'>{'メッセージ'}</Button>
                </>
              )}
            </div>
          </div>
        </div>

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

      <Dialog open={isFollowListOpen} onOpenChange={setIsFollowListOpen}>
        <DialogContent className='max-w-md max-h-[80vh] overflow-y-auto bg-white'>
          <DialogHeader>
            <DialogTitle className='text-black'>フォロー中のユーザー</DialogTitle>
          </DialogHeader>
          <div className='mt-4 space-y-4'>
            {loadingFollows ? (
              <div className='text-center py-8 text-gray-600'>
                読み込み中...
              </div>
            ) : followedUsers.length === 0 ? (
              <div className='text-center py-8 text-gray-600'>
                フォロー中のユーザーはいません
              </div>
            ) : (
              followedUsers.map((followedUser) => (
                <Link
                  key={followedUser.id}
                  href={`/mypage?userId=${followedUser.id}`}
                  className='flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors'
                  onClick={() => setIsFollowListOpen(false)}
                >
                  <Avatar className='h-10 w-10'>
                    <AvatarImage src={followedUser.avatar_url || undefined} />
                    <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(followedUser.id)} text-white`}>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        className='h-5 w-5 opacity-90'
                      >
                        <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
                        <circle cx='12' cy='7' r='4' />
                      </svg>
                    </AvatarFallback>
                  </Avatar>
                  <div className='flex-1'>
                    <p className='text-black font-medium'>
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

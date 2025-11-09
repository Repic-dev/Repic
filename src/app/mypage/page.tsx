'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImageGallery } from '@/components/ui/imageGallery'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/libs/supabase'
import { useToast } from '@/usecases/useToast'

interface ProfileData {
  display_name: string | null
  avatar_url: string | null
  bio: string | null
}

interface FollowedUser {
  id: string
  display_name: string | null
  avatar_url: string | null
}

function UserProfileContent() {
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const userIdParam = searchParams.get('userId')

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [imageCount, setImageCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [isFollowListOpen, setIsFollowListOpen] = useState(false)
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([])
  const [loadingFollows, setLoadingFollows] = useState(false)
  const [followingCount, setFollowingCount] = useState(0)

  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [isTogglingFollow, setIsTogglingFollow] = useState(false)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [avatarVersion, setAvatarVersion] = useState<number>(0)
  const [signedAvatarUrl, setSignedAvatarUrl] = useState<string | null>(null)
  const [followedUsersSigned, setFollowedUsersSigned] = useState<Record<string, string | null>>({})

  const { toast } = useToast()

  const targetUserId = userIdParam || user?.id
  const isOwnProfile = targetUserId === user?.id

  useEffect(() => {
    const fetchProfile = async () => {
      if (!targetUserId) { setLoading(false); return }
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, bio')
          .eq('id', targetUserId)
          .maybeSingle()

        if (profileData) {
          setProfile(profileData)
        } else {
          setProfile({ display_name: 'ユーザー', avatar_url: null, bio: null })
        }

        const { count } = await supabase
          .from('images')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', targetUserId)
        setImageCount(count || 0)

        await fetchFollowStatus()
        if (user?.id && targetUserId === user.id) {
          await fetchFollowingCount()
        }
      } finally {
        setLoading(false)
      }
    }
    if (!authLoading) { fetchProfile() }
  }, [targetUserId, authLoading])

  // Helper: resolve storage path or storage URL to a signed URL
  const resolveToSignedUrl = async (value: string | null | undefined, expiresSec: number) => {
    if (!value) return null
    if (value.startsWith('http')) {
      const m = value.match(/\/storage\/v1\/object(?:\/public)?\/avatars\/(.+)$/)
      if (m && m[1]) {
        const { data } = await supabase.storage.from('avatars').createSignedUrl(m[1], expiresSec)
        return data?.signedUrl || null
      }
      return value
    }
    const { data } = await supabase.storage.from('avatars').createSignedUrl(value, expiresSec)
    return data?.signedUrl || null
  }

  // Resolve a signed URL for the profile avatar path when it changes
  useEffect(() => {
    const run = async () => {
      const signed = await resolveToSignedUrl(profile?.avatar_url ?? null, 60 * 60 * 24 * 30)
      setSignedAvatarUrl(signed)
    }
    run()
  }, [profile?.avatar_url])

  const withCacheBust = (url: string | null, v: number) => {
    if (!url) return url
    return url.includes('?') ? `${url}&v=${v}` : `${url}?v=${v}`
  }

  const fetchFollowStatus = async () => {
    if (!targetUserId) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/follow/status?userId=${targetUserId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setIsFollowing(data.isFollowing)
      setFollowerCount(data.followerCount)
    }
  }

  const fetchFollowedUsers = async () => {
    if (!user?.id) return
    setLoadingFollows(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setFollowedUsers([]); return }
      const res = await fetch('/api/follow/list', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (res.ok) {
        const data = await res.json()
        setFollowedUsers(data.users || [])
        setFollowingCount((data.users || []).length)
      } else {
        setFollowedUsers([])
      }
    } finally { setLoadingFollows(false) }
  }

  const fetchFollowingCount = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setFollowingCount(0); return }
    const res = await fetch('/api/follow/list', { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (res.ok) {
      const data = await res.json()
      setFollowingCount((data.users || []).length)
    }
  }

  const handleToggleFollow = async () => {
    if (!user || !targetUserId || isTogglingFollow) return
    if (targetUserId === user.id) return
    setIsTogglingFollow(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({ title: 'エラー', description: 'ログインが必要です', variant: 'destructive' })
        return
      }
      const action = isFollowing ? 'unfollow' : 'follow'
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ followingId: targetUserId, action })
      })
      if (res.ok) {
        await fetchFollowStatus()
        setIsFollowing(!isFollowing)
        toast({ title: '成功', description: '更新しました', variant: 'success' })
      } else {
        toast({ title: 'エラー', description: 'フォロー操作に失敗しました', variant: 'destructive' })
      }
    } finally { setIsTogglingFollow(false) }
  }

  const handleOpenFollowList = () => { setIsFollowListOpen(true); fetchFollowedUsers() }

  const openEditModal = () => {
    setEditDisplayName(profile?.display_name || '')
    setEditBio(profile?.bio || '')
    setAvatarFile(null)
    setAvatarPreview(profile?.avatar_url || null)
    setIsEditOpen(true)
  }

  const onAvatarChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0] || null
    setAvatarFile(file)
    setAvatarPreview(file ? URL.createObjectURL(file) : (profile?.avatar_url || null))
  }

  const handleSaveProfile = async () => {
    if (!user) { toast({ title: 'エラー', description: 'ログインが必要です', variant: 'destructive' }); return }
    setIsSavingProfile(true)
    try {
      let avatarUrl = profile?.avatar_url || null
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'png'
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: false })
        if (uploadError) {
          console.error('Supabase upload error:', uploadError)
          toast({ title: 'エラー', description: 'アバターのアップロードに失敗しました', variant: 'destructive' })
          return
        }
        avatarUrl = path
      }
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: editDisplayName || null, bio: editBio || null, avatar_url: avatarUrl })
        .eq('id', user.id)
      if (updateError) { toast({ title: 'エラー', description: 'プロフィールの更新に失敗しました', variant: 'destructive' }); return }
      setProfile({ display_name: editDisplayName || null, bio: editBio || null, avatar_url: avatarUrl })
      setAvatarVersion(Date.now())
      toast({ title: '保存しました', description: 'プロフィールを更新しました', variant: 'success' })
      setIsEditOpen(false)
    } finally { setIsSavingProfile(false) }
  }

  if (authLoading || loading) {
    return (
      <div className='min-h-screen bg-black text-white flex items-center justify-center'>
        <div className='text-muted-foreground'>読み込み中...</div>
      </div>
    )
  }

  if (!userIdParam && !user) {
    return (
      <div className='min-h-screen bg-black text-white flex items-center justify-center'>
        <div className='text-muted-foreground'>ログインが必要です</div>
      </div>
    )
  }

  const getAvatarGradient = (userId: string | undefined) => 'from-blue-500 to-purple-600'
  const getDisplayName = () => profile?.display_name || 'ユーザー'

  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='w-full py-6 flex justify-start'>
        <Link href='/' className='cursor-pointer hover:opacity-80 transition-opacity'>
          <Image src='/repicLogo.png' alt='Repic' width={150} height={40} className='object-contain' />
        </Link>
      </div>

      <div className='max-w-6xl mx-auto py-8'>
        <div className='flex flex-col md:flex-row gap-8 items-start mb-8'>
          <Avatar className='h-24 w-24 md:h-32 md:w-32 border-2 border-primary/20'>
            <AvatarImage
              key={(signedAvatarUrl || 'noavatar') + ':' + avatarVersion}
              src={signedAvatarUrl ? `${signedAvatarUrl}?v=${avatarVersion}` : undefined}
              alt='avatar'
            />
            <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(targetUserId)} text-white`}>
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='h-12 w-12 md:h-16 md:w-16 opacity-90'>
                <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
                <circle cx='12' cy='7' r='4' />
              </svg>
            </AvatarFallback>
          </Avatar>

          <div className='flex-1 space-y-4'>
            <div>
              <h1 className='text-3xl md:text-4xl font-bold mb-2 text-balance'>{getDisplayName()}</h1>
              {profile?.bio && (<p className='text-muted-foreground text-lg leading-relaxed'>{profile.bio}</p>)}
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

            <div className='flex gap-3'>
              {isOwnProfile ? (
                <>
                  <Button className='bg-primary hover:bg-primary/90' onClick={openEditModal}>プロフィール編集</Button>
                  <Button className='bg-primary hover:bg-primary/90' onClick={handleOpenFollowList}>{`フォロー (${followingCount})`}</Button>
                </>
              ) : (
                <>
                  <Button className={isFollowing ? 'bg-gray-600 hover:bg-gray-700' : 'bg-primary hover:bg-primary/90'} onClick={handleToggleFollow} disabled={isTogglingFollow}>
                    {isTogglingFollow ? '処理中...' : (isFollowing ? 'フォロー中' : 'フォロー')}
                  </Button>
                  <Button variant='outline'>メッセージ</Button>
                </>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue='gallery' className='w-full'>
          <TabsList className='inline-flex w-full mb-8 h-auto p-1 bg-white rounded-lg'>
            <TabsTrigger value='gallery' className='flex-1 rounded-md px-4 py-3 text-gray-600 data-[state=active]:bg-gray-200 data-[state=active]:text-gray-900 hover:text-gray-900 transition-colors'>
              ギャラリー
            </TabsTrigger>
            <TabsTrigger value='liked' className='flex-1 rounded-md px-4 py-3 text-gray-600 data-[state=active]:bg-gray-200 data-[state=active]:text-gray-900 hover:text-gray-900 transition-colors'>
              いいね
            </TabsTrigger>
            <TabsTrigger value='collections' className='hidden'>
              コレクション
            </TabsTrigger>
          </TabsList>

          <TabsContent value='gallery' className='mt-0 w-full'>
            <ImageGallery userId={targetUserId} onImageDeleted={async () => {
              if (targetUserId) {
                const { count } = await supabase
                  .from('images')
                  .select('*', { count: 'exact', head: true })
                  .eq('profile_id', targetUserId)
                setImageCount(count || 0)
              }
            }} />
          </TabsContent>

          <TabsContent value='liked' className='mt-0 w-full'>
            <div className='text-center py-16 text-muted-foreground'>いいねした作品がここに表示されます</div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isFollowListOpen} onOpenChange={setIsFollowListOpen}>
        <DialogContent className='max-w-md max-h-[80vh] overflow-y-auto bg-black text-white border border-border'>
          <DialogHeader>
            <DialogTitle>フォロー中のユーザー</DialogTitle>
          </DialogHeader>
          <div className='mt-4 space-y-4'>
            {loadingFollows ? (
              <div className='text-center py-8 text-gray-300'>読み込み中...</div>
            ) : followedUsers.length === 0 ? (
              <div className='text-center py-8 text-gray-300'>フォロー中のユーザーはいません</div>
            ) : (
              followedUsers.map((followedUser) => (
                <Link key={followedUser.id} href={`/mypage?userId=${followedUser.id}`} className='flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors' onClick={() => setIsFollowListOpen(false)}>
                  <Avatar className='h-10 w-10'>
                    <AvatarImage src={(followedUsersSigned[followedUser.id] || undefined) as string | undefined} />
                    <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(followedUser.id)} text-white`}>
                      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5 opacity-90'>
                        <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
                        <circle cx='12' cy='7' r='4' />
                      </svg>
                    </AvatarFallback>
                  </Avatar>
                  <div className='flex-1'>
                    <p className='text-white font-medium'>{followedUser.display_name || 'ユーザー'}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className='max-w-lg w-full bg-black text-white border border-border'>
          <DialogHeader>
            <DialogTitle>プロフィールを編集</DialogTitle>
          </DialogHeader>
          <div className='space-y-5'>
            <div className='flex items-center gap-4'>
              <div className='relative h-20 w-20 rounded-full overflow-hidden border border-gray-200'>
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt='avatar preview' className='h-full w-full object-cover' />
                ) : (
                  <div className='h-full w-full flex items-center justify-center bg-gray-800 text-gray-300'>
                    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='h-8 w-8'>
                      <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
                      <circle cx='12' cy='7' r='4' />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <label className='inline-block cursor-pointer px-3 py-2 rounded-md bg-gray-800 text-white hover:bg-gray-700 border border-gray-600'>
                  画像を選択
                  <input type='file' accept='image/*' className='hidden' onChange={onAvatarChange} />
                </label>
                <p className='text-xs text-gray-400 mt-1'>PNG/JPG, 5MBまで</p>
              </div>
            </div>
            <div>
              <label className='block text-sm font-medium mb-1'>表示名</label>
              <input type='text' value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} placeholder='表示名を入力' maxLength={50} className='w-full rounded-md border border-gray-700 bg-gray-900 text-white placeholder-gray-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-600' />
            </div>
            <div>
              <label className='block text-sm font-medium mb-1'>自己紹介</label>
              <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder='自己紹介を入力' rows={4} maxLength={280} className='w-full rounded-md border border-gray-700 bg-gray-900 text-white placeholder-gray-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-600' />
              <p className='text-xs text-gray-400 mt-1'>{editBio.length}/280</p>
            </div>
            <div className='flex justify-end gap-2'>
              <Button variant='outline' onClick={() => setIsEditOpen(false)} disabled={isSavingProfile}>キャンセル</Button>
              <Button className='bg-white text-black hover:bg-white/90' onClick={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function UserProfile() {
  return (
    <Suspense fallback={<div className='min-h-screen bg-black text-white flex items-center justify-center'><div className='text-muted-foreground'>読み込み中...</div></div>}>
      <UserProfileContent />
    </Suspense>
  )
}






import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
});

// 認証ヘルパー関数
async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

// フォロー状態とフォロワー数を取得
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'userIdが必要です' },
        { status: 400 }
      );
    }

    let isFollowing = false;
    if (user) {
      // フォロー状態を確認
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: targetUserId,
          },
        },
      });
      isFollowing = !!follow;
    }

    // フォロワー数を取得
    const followerCount = await prisma.follow.count({
      where: {
        followingId: targetUserId,
      },
    });

    return NextResponse.json({
      isFollowing,
      followerCount,
    });
  } catch (error: any) {
    console.error('フォロー状態取得エラー:', error);
    return NextResponse.json(
      { error: error?.message ?? 'フォロー状態の取得に失敗しました' },
      { status: 500 }
    );
  }
}


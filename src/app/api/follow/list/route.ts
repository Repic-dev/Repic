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

// フォロー一覧を取得
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // フォローしているユーザー一覧を取得
    const follows = await prisma.follow.findMany({
      where: {
        followerId: user.id,
      },
      include: {
        following: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const followedUsers = follows.map((follow) => ({
      id: follow.following.id,
      display_name: follow.following.displayName,
      avatar_url: follow.following.avatarUrl,
    }));

    return NextResponse.json({
      users: followedUsers,
    });
  } catch (error: any) {
    console.error('フォロー一覧取得エラー:', error);
    return NextResponse.json(
      { error: error?.message ?? 'フォロー一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}


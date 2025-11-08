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

// フォロー/アンフォロー
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { followingId, action } = await req.json();

    if (!followingId) {
      return NextResponse.json(
        { error: 'followingIdが必要です' },
        { status: 400 }
      );
    }

    if (action !== 'follow' && action !== 'unfollow') {
      return NextResponse.json(
        { error: 'actionはfollowまたはunfollowである必要があります' },
        { status: 400 }
      );
    }

    // 自分自身をフォローできないようにする
    if (user.id === followingId) {
      return NextResponse.json(
        { error: '自分自身をフォローすることはできません' },
        { status: 400 }
      );
    }

    const followerId = user.id;

    if (action === 'follow') {
      // フォロー
      try {
        await prisma.follow.create({
          data: {
            followerId,
            followingId,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'フォローしました',
        });
      } catch (error: any) {
        // 既にフォローしている場合
        if (error.code === 'P2002') {
          return NextResponse.json(
            { error: '既にフォローしています' },
            { status: 400 }
          );
        }
        throw error;
      }
    } else {
      // アンフォロー
      const result = await prisma.follow.deleteMany({
        where: {
          followerId,
          followingId,
        },
      });

      if (result.count === 0) {
        return NextResponse.json(
          { error: 'フォローしていません' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'フォローを解除しました',
      });
    }
  } catch (error: any) {
    console.error('フォローエラー:', error);
    return NextResponse.json(
      { error: error?.message ?? 'フォロー操作に失敗しました' },
      { status: 500 }
    );
  }
}


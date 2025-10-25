import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

// 環境変数のチェック
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// OpenAI クライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Prisma クライアントの初期化
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
});


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'クエリが指定されていません' },
        { status: 400 }
      );
    }

    

    // 1. OpenAI APIでクエリをベクトル化
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: 'float',
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;
    

    // 2. PostgreSQL/Supabaseでベクトル類似度検索（コサイン類似度）
    // pgvectorの <=> 演算子を使用（コサイン距離）
    const vectorString = `[${queryEmbedding.join(',')}]`;

    const results = await prisma.$queryRaw<
      Array<{
        id: string;
        profile_id: string | null;
        prompt: string;
        image_url: string;
        created_at: Date;
        similarity: number;
        display_name: string | null;
      }>
    >`
      SELECT
        i.id,
        i.profile_id,
        i.prompt,
        i.image_url,
        i.created_at,
        1 - (i.embedding_vector <=> ${vectorString}::vector) as similarity,
        p.display_name
      FROM images i
      LEFT JOIN profiles p ON i.profile_id = p.id
      WHERE i.embedding_vector IS NOT NULL
      ORDER BY i.embedding_vector <=> ${vectorString}::vector
      LIMIT 5
    `;

    

    // 3. フロントエンド用にフォーマット
    const formattedResults = results.map((row) => ({
      id: row.id,
      userId: row.profile_id,
      profileId: row.profile_id,
      displayName: row.display_name,
      prompt: row.prompt,
      imageUrl: row.image_url,
      createdAt: row.created_at.toISOString(),
      similarity: Number(row.similarity),
    }));

    return NextResponse.json({
      success: true,
      query,
      results: formattedResults,
      count: formattedResults.length,
    });
  } catch (error) {
    console.error('検索エラー:', error);
    return NextResponse.json(
      {
        error: '検索中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}

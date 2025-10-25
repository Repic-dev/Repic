import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";

// 環境変数のチェック
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Supabase クライアントの初期化（Service Role Key使用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

export async function POST(req: Request) {
  try {
    const { imageUrl, prompt, profileId } = await req.json();

    if (!imageUrl || !prompt) {
      return NextResponse.json(
        { error: "imageUrl and prompt are required" },
        { status: 400 }
      );
    }

    // 1. 画像をダウンロード
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to download image");
    }
    const imageBlob = await imageResponse.blob();
    const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

    // 2. Supabase Storageにアップロード
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw new Error("Failed to upload image to Supabase Storage");
    }

    // 3. 公開URLを取得
    const { data: publicUrlData } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    // 4. プロンプトをベクトル化
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: prompt,
      encoding_format: "float",
    });

    const embedding = embeddingResponse.data[0].embedding;

    // 5. Prismaでデータベースに保存
    const vectorString = `[${embedding.join(",")}]`;

    let savedImage;
    if (profileId) {
      savedImage = await prisma.$executeRaw`
        INSERT INTO images (profile_id, prompt, image_url, embedding_vector)
        VALUES (${profileId}::uuid, ${prompt}, ${publicUrl}, ${vectorString}::vector)
      `;
    } else {
      savedImage = await prisma.$executeRaw`
        INSERT INTO images (profile_id, prompt, image_url, embedding_vector)
        VALUES (NULL, ${prompt}, ${publicUrl}, ${vectorString}::vector)
      `;
    }
    

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
    });
  } catch (e: any) {
    console.error("投稿エラー:", e);
    return NextResponse.json(
      { error: e?.message ?? "post failed" },
      { status: 500 }
    );
  }
}

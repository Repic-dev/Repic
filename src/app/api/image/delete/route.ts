import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

// 環境変数のチェック
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Supabase クライアントの初期化（Service Role Key使用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Prisma クライアントの初期化
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
});

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json(
        { error: "imageId is required" },
        { status: 400 }
      );
    }

    // 認証チェック
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "認証に失敗しました" },
        { status: 401 }
      );
    }

    // 画像情報を取得して所有者を確認
    const image = await prisma.$queryRaw<Array<{ profile_id: string | null; image_url: string }>>`
      SELECT profile_id, image_url
      FROM images
      WHERE id = ${imageId}::uuid
    `;

    if (!image || image.length === 0) {
      return NextResponse.json(
        { error: "画像が見つかりません" },
        { status: 404 }
      );
    }

    const imageData = image[0];

    // 所有者チェック（自分の画像のみ削除可能）
    if (imageData.profile_id !== user.id) {
      return NextResponse.json(
        { error: "この画像を削除する権限がありません" },
        { status: 403 }
      );
    }

    // Supabase Storageから画像ファイルを削除
    // URLからファイル名を抽出
    const imageUrl = imageData.image_url;
    let fileName: string | null = null;
    
    // Supabase StorageのURL形式: /storage/v1/object/public/images/[filename]
    const imagesIndex = imageUrl.indexOf("/images/");
    if (imagesIndex !== -1) {
      const pathAfterImages = imageUrl.substring(imagesIndex + "/images/".length);
      fileName = pathAfterImages.split("?")[0].split("#")[0]; // クエリパラメータとフラグメントを除去
    } else {
      // フォールバック: URLの最後の部分を取得
      const urlParts = imageUrl.split("/");
      fileName = urlParts[urlParts.length - 1].split("?")[0].split("#")[0];
    }

    if (fileName) {
      const { error: storageError } = await supabase.storage
        .from("images")
        .remove([fileName]);

      if (storageError) {
        console.error("Storage削除エラー:", storageError);
        // Storageの削除に失敗してもデータベースの削除は続行
      }
    }

    // データベースから画像レコードを削除
    await prisma.$executeRaw`
      DELETE FROM images
      WHERE id = ${imageId}::uuid
    `;

    return NextResponse.json({
      success: true,
      message: "画像を削除しました",
    });
  } catch (e: any) {
    console.error("画像削除エラー:", e);
    return NextResponse.json(
      { error: e?.message ?? "画像の削除に失敗しました" },
      { status: 500 }
    );
  }
}


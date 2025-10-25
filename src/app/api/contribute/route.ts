import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import OpenAI from "openai";
import { PrismaClient } from "@/generated/prisma";

type SupabaseAuthSession = {
  access_token?: string;
  user?: { id?: string } | null;
  currentSession?: {
    access_token?: string;
    user?: { id?: string } | null;
  } | null;
};

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4;
    const padded = normalized + (padding ? "=".repeat(4 - padding) : "");
    return Buffer.from(padded, "base64").toString("utf-8");
  } catch (error) {
    console.error("Failed to decode base64 cookie payload:", error);
    return null;
  }
}

function parseSupabaseAuthToken(cookieHeader: string | null): SupabaseAuthSession | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const part of cookies) {
    const [rawKey, ...rawValueParts] = part.split("=");
    const key = rawKey?.trim();
    if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) {
      continue;
    }

    const joinedValue = rawValueParts.join("=");
    if (!joinedValue) {
      continue;
    }

    let candidateValue = joinedValue.trim();
    try {
      candidateValue = decodeURIComponent(candidateValue);
    } catch (error) {
      console.error("Failed to decode auth cookie component:", error);
    }

    if (candidateValue.startsWith("base64-")) {
      const decoded = decodeBase64Url(candidateValue.slice("base64-".length));
      if (!decoded) {
        continue;
      }
      candidateValue = decoded;
    }

    try {
      return JSON.parse(candidateValue) as SupabaseAuthSession;
    } catch (error) {
      console.error("Failed to parse Supabase auth cookie:", error);
    }
  }

  return null;
}

// 環境変数のチェック
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
}
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Supabase クライアントの初期化（Service Role Key使用）
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// OpenAI クライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Prisma クライアントの初期化
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
});

async function ensureProfileExists(profileId: string, user: User): Promise<string | null> {
  const existingProfile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true },
  });

  if (existingProfile?.id) {
    return existingProfile.id;
  }

  const authUsers = await prisma.$queryRaw<
    { id: string; email: string | null }[]
  >`SELECT id::text AS id, email FROM auth.users WHERE id = ${profileId}::uuid LIMIT 1`;

  if (!authUsers[0]) {
    console.error("auth.users record missing for profile", profileId);
    return null;
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    typeof metadata.display_name === "string"
      ? metadata.display_name
      : typeof metadata.full_name === "string"
        ? metadata.full_name
        : typeof metadata.name === "string"
          ? metadata.name
          : typeof user.email === "string"
            ? user.email
            : null;
  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

  try {
    await prisma.profile.upsert({
      where: { id: profileId },
      create: {
        id: profileId,
        displayName: displayName ?? null,
        avatarUrl: avatarUrl ?? null,
      },
      update: {
        displayName: displayName ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
      },
    });
  } catch (error) {
    console.error("Failed to upsert profile via Prisma:", error);
    return null;
  }

  const confirmedProfile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true },
  });

  return confirmedProfile?.id ?? null;
}

export async function POST(req: Request) {
  try {
    const { imageUrl, prompt } = await req.json();

    if (!imageUrl || !prompt) {
      return NextResponse.json(
        { error: "imageUrl and prompt are required" },
        { status: 400 }
      );
    }

    

    const authorization = req.headers.get("authorization");
    let accessToken: string | null = null;

    if (authorization?.startsWith("Bearer ")) {
      accessToken = authorization.slice("Bearer ".length).trim() || null;
    }

    if (!accessToken) {
      const authSession = parseSupabaseAuthToken(req.headers.get("cookie"));
      accessToken =
        authSession?.access_token ?? authSession?.currentSession?.access_token ?? null;
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      data: authUser,
      error: authError,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !authUser?.user) {
      console.error("Supabase auth error:", authError);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const profileId = authUser.user.id;

    const ensuredProfileId = await ensureProfileExists(profileId, authUser.user);
    if (!ensuredProfileId) {
      console.error("Profile not found for authenticated user", profileId);
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }
    const finalProfileId = ensuredProfileId;

    // 1. 画像をダウンロード
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to download image");
    }
    const imageBlob = await imageResponse.blob();
    const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

    // 2. Supabase Storageにアップロード
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
    const { error: uploadError } = await supabaseService.storage
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
    const { data: publicUrlData } = supabaseService.storage
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

    // 5. Supabase経由でデータベースに保存
    const vectorString = `[${embedding.join(",")}]`;

    await prisma.$executeRaw`
      INSERT INTO images (profile_id, prompt, image_url, embedding_vector)
      VALUES (${finalProfileId}::uuid, ${prompt}, ${publicUrl}, ${vectorString}::vector)
    `;


    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
    });
  } catch (e: any) {
    console.error("寄稿エラー:", e);
    return NextResponse.json(
      { error: e?.message ?? "contribute failed" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { PrismaClient, Prisma } from "@/generated/prisma";

type SupabaseAuthSession = {
  access_token?: string;
  user?: { id?: string } | null;
  currentSession?: {
    access_token?: string;
    user?: { id?: string } | null;
  } | null;
};

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

    const rawValue = rawValueParts.join("=").trim();
    if (!rawValue) {
      continue;
    }

    let jsonPayload = rawValue;
    if (rawValue.startsWith("base64-")) {
      const base64 = rawValue.slice("base64-".length);
      try {
        jsonPayload = Buffer.from(base64, "base64").toString("utf-8");
      } catch (error) {
        console.error("Failed to decode Supabase auth cookie:", error);
        continue;
      }
    }

    try {
      return JSON.parse(jsonPayload) as SupabaseAuthSession;
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
    db: { url: process.env.DATABASE_URL },
  },
});

async function ensureProfileExists(profileId: string): Promise<string | null> {
  try {
    const existingProfile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true },
    });

    if (existingProfile?.id) {
      return existingProfile.id;
    }
  } catch (error) {
    console.error("Failed to query profile via Prisma:", error);
  }

  const { data: userData, error: adminError } = await supabase.auth.admin.getUserById(
    profileId
  );

  if (adminError || !userData?.user) {
    console.error("Supabase admin user lookup failed:", adminError);
    return null;
  }

  const metadata = (userData.user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    typeof metadata.display_name === "string"
      ? metadata.display_name
      : typeof metadata.full_name === "string"
        ? metadata.full_name
        : typeof metadata.name === "string"
          ? metadata.name
          : typeof userData.user.email === "string"
            ? userData.user.email
            : null;
  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

  try {
    await prisma.profile.create({
      data: {
        id: profileId,
        displayName,
        avatarUrl,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Profile already created concurrently, continue.
      } else if (error.code === "P2003") {
        console.error("Profile creation failed due to missing auth user:", error);
        return null;
      } else {
        console.error("Profile creation failed:", error);
      }
    } else {
      console.error("Unexpected profile creation error:", error);
    }
  }

  try {
    const confirmedProfile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true },
    });

    return confirmedProfile?.id ?? null;
  } catch (error) {
    console.error("Failed to confirm profile existence via Prisma:", error);
    return null;
  }
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

    

    const authSession = parseSupabaseAuthToken(req.headers.get("cookie"));
    const accessToken =
      authSession?.access_token ?? authSession?.currentSession?.access_token ?? null;
    let profileId =
      authSession?.user?.id ?? authSession?.currentSession?.user?.id ?? null;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!profileId) {
      const {
        data,
        error: authError,
      } = await supabase.auth.getUser(accessToken);

      if (authError || !data?.user?.id) {
        console.error("Supabase auth error:", authError);
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      profileId = data.user.id;
    }

    if (!profileId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ensuredProfileId = await ensureProfileExists(profileId);
    if (!ensuredProfileId) {
      console.error("Profile not found for authenticated user", profileId);
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }
    profileId = ensuredProfileId;

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

    await prisma.$executeRaw`
      INSERT INTO images (profile_id, prompt, image_url, embedding_vector)
      VALUES (CAST(${profileId} AS uuid), ${prompt}, ${publicUrl}, ${vectorString}::vector)
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

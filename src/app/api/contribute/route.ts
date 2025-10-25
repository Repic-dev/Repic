import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
type SupabaseAuthSession = {
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  user?: { id?: string | null } | null;
  currentSession?: {
    access_token?: string | null;
    refresh_token?: string | null;
    expires_at?: number | null;
    token_type?: string | null;
    user?: { id?: string | null } | null;
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
      const parsed = JSON.parse(candidateValue) as SupabaseAuthSession | { access_token?: string | null };
      if (parsed && typeof parsed === "object") {
        return parsed as SupabaseAuthSession;
      }
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
// Supabase クライアントの初期化（Service Role Key使用）
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// OpenAI クライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function decodeJwtUserId(token: string | null): string | null {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const decoded = Buffer.from(payload, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as { sub?: unknown };
    return typeof parsed.sub === "string" ? parsed.sub : null;
  } catch (error) {
    console.error("Failed to decode Supabase JWT payload:", error);
    return null;
  }
}

async function resolveProfileId(req: Request): Promise<string | null> {
  const authorization = req.headers.get("authorization");
  const authSession = parseSupabaseAuthToken(req.headers.get("cookie"));

  let accessToken: string | null = null;
  if (authorization?.startsWith("Bearer ")) {
    accessToken = authorization.slice("Bearer ".length).trim() || null;
  }

  if (!accessToken) {
    accessToken =
      authSession?.access_token ?? authSession?.currentSession?.access_token ?? null;
  }

  let userId: string | null = null;

  if (accessToken) {
    try {
      const {
        data: { user },
        error,
      } = await supabaseService.auth.getUser(accessToken);

      if (!error && user?.id) {
        userId = user.id;
      } else if (error) {
        console.error("Supabase access token validation failed:", error);
      }
    } catch (error) {
      console.error("Unexpected Supabase auth.getUser failure:", error);
    }
  }

  if (!userId) {
    userId = decodeJwtUserId(accessToken);
  }

  if (!userId) {
    const sessionUserId =
      authSession?.user?.id ?? authSession?.currentSession?.user?.id ?? null;
    if (typeof sessionUserId === "string" && sessionUserId.length > 0) {
      userId = sessionUserId;
    }
  }

  if (!userId) {
    return null;
  }

  try {
    const { data, error } = await supabaseService
      .from<{ id: string }>("profiles")
      .select("id")
      .eq("id", userId)
      .limit(1);

    if (error && error.code !== "PGRST116") {
      console.error("Failed to verify profile existence:", error);
      return null;
    }

    const profileRecord = Array.isArray(data) ? data[0] : undefined;
    if (profileRecord?.id && typeof profileRecord.id === "string") {
      return profileRecord.id;
    }
  } catch (error) {
    console.error("Unexpected error while resolving profile:", error);
  }

  return null;
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

    

    const finalProfileId = await resolveProfileId(req);

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
    const { error: insertError } = await supabaseService
      .from("images")
      .insert({
        profile_id: finalProfileId ?? null,
        prompt,
        image_url: publicUrl,
        embedding_vector: embedding,
      });

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      throw new Error("Failed to save image metadata");
    }


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

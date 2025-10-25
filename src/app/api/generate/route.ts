import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 環境変数のチェック
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req: Request) {
  try {
    const { prompt, size = "1024x1024" } = await req.json();
    if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const out = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      size,
    });

    if (!out.data || out.data.length === 0) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    const tempImageUrl = out.data[0].url;
    if (!tempImageUrl) {
      return NextResponse.json({ error: "No image URL returned" }, { status: 500 });
    }

    const imageResponse = await fetch(tempImageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to download generated image");
    }
    const imageBlob = await imageResponse.blob();
    const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

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

    const { data: publicUrlData } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);

    const permanentUrl = publicUrlData.publicUrl;

    return NextResponse.json({ imageUrl: permanentUrl });
  } catch (e: any) {
    console.error('OpenAI API Error:', {
      message: e?.message,
      code: e?.code,
      type: e?.type,
      status: e?.status,
      param: e?.param,
    });

    if (e?.code === 'billing_hard_limit_reached' || e?.code === 'insufficient_quota') {
      return NextResponse.json({
        error: "APIの課金制限に達しました。しばらく時間をおいてから再度お試しください。",
        code: "BILLING_LIMIT_REACHED",
        details: e?.message
      }, { status: 402 });
    }

    if (e?.type === 'image_generation_user_error') {
      return NextResponse.json({
        error: "画像生成に失敗しました: " + (e?.message || "プロンプトを変更してお試しください。"),
        code: "GENERATION_ERROR",
        details: e?.message
      }, { status: 400 });
    }

    return NextResponse.json({
      error: e?.message ?? "画像生成に失敗しました。",
      code: "UNKNOWN_ERROR",
      details: e?.message
    }, { status: 500 });
  }
}

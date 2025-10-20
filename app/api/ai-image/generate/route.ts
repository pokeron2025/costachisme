// app/api/ai-image/generate/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateImageFromPrompt } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { postId, prompt } = await req.json();

    if (!postId || !prompt) {
      return NextResponse.json({ ok: false, error: "postId y prompt son requeridos" }, { status: 400 });
    }

    // Genera imagen con Cloudflare y súbela a Supabase Storage
    const imageUrl = await generateImageFromPrompt(prompt);

    // Guarda en cola como "pending" para aprobación
    const { error } = await supabaseAdmin.from("ai_images").insert({
      post_id: postId,
      prompt,
      image_url: imageUrl,
      status: "pending",
    });

    if (error) throw error;

    return NextResponse.json({ ok: true, image_url: imageUrl });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error generando imagen" }, { status: 500 });
  }
}
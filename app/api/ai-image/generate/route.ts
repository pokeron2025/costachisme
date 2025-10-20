import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateImageFromPrompt } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { postId, prompt } = await req.json();
    if (!postId || !prompt) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

    const imageUrl = await generateImageFromPrompt(prompt);

    const { data, error } = await supabaseAdmin
      .from("ai_images")
      .insert({ post_id: postId, prompt, image_url: imageUrl, status: 'pending' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, image: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { id, approvedBy } = await req.json();
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.ADMIN_QUEUE_TOKEN}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("ai_images")
      .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: approvedBy ?? null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    try {
      // Si existe posts.image_url, se actualiza automáticamente
      await supabaseAdmin.from('posts').update({ image_url: (data as any).image_url }).eq('id', (data as any).post_id);
    } catch {}

    return NextResponse.json({ ok: true, image: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

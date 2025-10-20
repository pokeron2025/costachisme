// app/api/ai-image/approve/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { id, approvedBy } = await req.json();

    // Token del panel
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.ADMIN_QUEUE_TOKEN}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1) Marcar como aprobado en la cola
    const { data, error } = await supabaseAdmin
      .from("ai_images")
      .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: approvedBy })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 2) Escribir la URL en tu tabla real (submissions)
    try {
      await supabaseAdmin
        .from("submissions")              // <— ANTES decía 'posts'
        .update({ image_url: (data as any).image_url })
        .eq("id", (data as any).post_id);   // ✅ correcto
    } catch {}

    return NextResponse.json({ ok: true, image: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
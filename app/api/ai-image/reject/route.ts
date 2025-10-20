import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.ADMIN_QUEUE_TOKEN}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("ai_images")
      .update({ status: 'rejected' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, image: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

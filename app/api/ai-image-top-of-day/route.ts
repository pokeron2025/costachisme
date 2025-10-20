import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function toISODate(d: Date) { return d.toISOString().slice(0,10); }

export async function POST() {
  try {
    const now = new Date();
    const y = new Date(now.getTime() - 24*60*60*1000);
    const dayStart = `${toISODate(y)}T00:00:00Z`;
    const dayEnd   = `${toISODate(y)}T23:59:59Z`;

    const { data: topPosts, error: topErr } = await supabaseAdmin
      .from('posts')
      .select('id, title, content, votes, created_at')
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)
      .order('votes', { ascending: false })
      .limit(1);

    if (topErr) throw topErr;
    if (!topPosts || topPosts.length === 0) {
      return NextResponse.json({ ok: true, message: 'No hubo publicaciones ayer' });
    }

    const top = topPosts[0];
    const prompt = `Ilustración descriptiva y limpia del tema: ${top.title}. Si es reporte ciudadano, representar el problema de forma comprensible, sin texto, estilo moderno, fondo claro.`;

    const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${base}/api/ai-image/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postId: (top as any).id, prompt })
    });

    const payload = await res.json();
    return NextResponse.json({ ok: true, topPost: top, image: (payload as any).image });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

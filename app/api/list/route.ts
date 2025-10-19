import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'; // evita cache en Vercel/Next para este endpoint

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  // 1) Trae publicaciones aprobadas
  const { data: subs, error } = await supabase
    .from('submissions')
    .select('id, created_at, category, title, content, barrio, imagen_url')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const ids = (subs ?? []).map(s => s.id);

  // 2) Trae totales de reacciones en batch
  let totalsById: Record<string, any> = {};
  if (ids.length) {
    const { data: totals, error: terr } = await supabase
      .from('reaction_totals')
      .select('submission_id, like_count, dislike_count, haha_count, wow_count, angry_count, sad_count')
      .in('submission_id', ids);

    if (terr) {
      return NextResponse.json({ ok: false, error: terr.message }, { status: 500 });
    }

    if (totals) {
      totalsById = totals.reduce((acc, t) => {
        acc[t.submission_id] = t;
        return acc;
      }, {} as Record<string, any>);
    }
  }

  // 3) Responde un arreglo con totales acoplados (para tu page.tsx)
  const withTotals = (subs ?? []).map(s => ({
    ...s,
    like_count: totalsById[s.id]?.like_count ?? 0,
    dislike_count: totalsById[s.id]?.dislike_count ?? 0,
    haha_count: totalsById[s.id]?.haha_count ?? 0,
    wow_count: totalsById[s.id]?.wow_count ?? 0,
    angry_count: totalsById[s.id]?.angry_count ?? 0,
    sad_count: totalsById[s.id]?.sad_count ?? 0,
  }));

  return NextResponse.json({ ok: true, data: withTotals });
}

// app/api/list/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ojo: service key para poder leer flagged/approved sin limitaciones
);

export async function GET() {
  // obtenemos aprobados y no marcados como flagged
  const { data: subs, error } = await supabase
    .from('submissions')
    .select('id, created_at, category, title, content, barrio, imagen_url, flagged')
    .eq('status', 'APPROVED')
    .or('flagged.is.null,flagged.eq.false')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // pides totales de reacciones
  const ids = (subs ?? []).map((s) => s.id);
  let totalsById: Record<string, any> = {};
  if (ids.length) {
    const { data: totals, error: terr } = await supabase
      .from('reaction_totals')
      .select(
        'submission_id, like_count, dislike_count, haha_count, wow_count, angry_count, sad_count'
      )
      .in('submission_id', ids);

    if (!terr && totals) {
      totalsById = totals.reduce((acc, t) => {
        acc[t.submission_id] = t;
        return acc;
      }, {} as Record<string, any>);
    }
  }

  // mezclamos con los totales
  const withTotals = (subs ?? []).map((s) => ({
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

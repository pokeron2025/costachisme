// app/api/reaction-totals/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  // Ajusta el SELECT según cómo devuelves los totales.
  // Si los totales vienen de la vista reaction_totals, consulta esa vista:
  // const { data, error } = await supabaseServer
  //   .from('reaction_totals')
  //   .select('like_count,dislike_count,haha_count,wow_count,angry_count,sad_count')
  //   .eq('submission_id', id)
  //   .maybeSingle();

  // Si los totales están “join-eados” en /api/list y quieres leer de submissions:
  const { data, error } = await supabaseServer
    .from('reaction_totals')
    .select(
      'like_count, dislike_count, haha_count, wow_count, angry_count, sad_count'
    )
    .eq('submission_id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Normaliza a ceros si aún no hay fila en la vista
  const totals = data ?? {
    like_count: 0,
    dislike_count: 0,
    haha_count: 0,
    wow_count: 0,
    angry_count: 0,
    sad_count: 0,
  };

  return NextResponse.json({ ok: true, data: totals });
}

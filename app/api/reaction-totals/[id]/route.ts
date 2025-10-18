import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Devuelve los totales desde la vista reaction_totals (o 0s si aún no hay filas)
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Falta id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('reaction_totals')
    .select('like_count,dislike_count,haha_count,wow_count,angry_count,sad_count')
    .eq('submission_id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

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

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Totals = {
  like_count: number;
  dislike_count: number;
  haha_count: number;
  wow_count: number;
  angry_count: number;
  sad_count: number;
};

const ZERO: Totals = {
  like_count: 0,
  dislike_count: 0,
  haha_count: 0,
  wow_count: 0,
  angry_count: 0,
  sad_count: 0,
};

// 👇 tip correcto de params en Next.js 15
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // aquí se resuelve params

  const { data, error } = await supabase
    .from('reaction_totals')
    .select(
      'like_count, dislike_count, haha_count, wow_count, angry_count, sad_count'
    )
    .eq('submission_id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, totals: data ?? ZERO });
}

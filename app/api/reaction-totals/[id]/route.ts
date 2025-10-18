import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  const { data, error } = await supabaseServer
    .from('submissions')
    .select(
      `
      id,
      like_count,
      dislike_count,
      haha_count,
      wow_count,
      angry_count,
      sad_count
    `
    )
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

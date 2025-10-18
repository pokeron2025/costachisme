import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { id, reaction, voter } = await req.json();

    if (!id || !reaction) {
      return NextResponse.json({ ok: false, error: 'Faltan datos' }, { status: 400 });
    }

    // Llama tu función SQL que hace el upsert (según montamos antes)
    const { error: rpcError } = await supabase.rpc('react', {
      p_submission_id: id,
      p_voter: voter ?? 'anon',
      p_reaction: reaction,
    });

    if (rpcError) {
      return NextResponse.json({ ok: false, error: rpcError.message }, { status: 500 });
    }

    // Lee los totales actualizados y regrésalos
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

    return NextResponse.json({ ok: true, totals: data ?? {
      like_count: 0, dislike_count: 0, haha_count: 0, wow_count: 0, angry_count: 0, sad_count: 0
    }});
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Error' }, { status: 500 });
  }
}

// app/api/vote/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { id, voter } = await req.json();

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Falta id' }, { status: 400 });
    }

    // 👇 Llamamos al RPC con los nombres nuevos de parámetros
    const { error } = await supabase.rpc('increment_score', {
      p_submission_id: id,
      p_voter: voter ?? 'anon',
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message ?? 'Error' },
      { status: 500 }
    );
  }
}

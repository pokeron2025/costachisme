// app/api/react/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { id, reaction, voter } = (await req.json()) as {
      id?: string;
      reaction?: 'like' | 'dislike' | 'haha' | 'wow' | 'angry' | 'sad';
      voter?: string;
    };

    if (!id || !reaction) {
      return NextResponse.json({ ok: false, error: 'Faltan parámetros' }, { status: 400 });
    }

    // 👉 MUY IMPORTANTE: nombres EXACTOS de parámetros de la función SQL
    // create or replace function public.react(p_submission_id uuid, p_voter text, p_reaction text)
    const { data, error } = await supabase.rpc('react', {
      p_submission_id: id,
      p_voter: voter ?? 'anon',
      p_reaction: reaction,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // La función devuelve una fila con los totales
    // returns table (like_count int, dislike_count int, haha_count int, wow_count int, angry_count int, sad_count int)
    const totalsRow = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ ok: true, totals: totalsRow ?? null });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Error' },
      { status: 500 }
    );
  }
}

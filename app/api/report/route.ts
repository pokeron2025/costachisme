import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { submissionId, reason, voter } = await req.json();

    if (!submissionId || typeof submissionId !== 'string') {
      return NextResponse.json({ ok: false, error: 'submissionId requerido' }, { status: 400 });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return NextResponse.json({ ok: false, error: 'reason inválido' }, { status: 400 });
    }
    if (!voter || typeof voter !== 'string') {
      return NextResponse.json({ ok: false, error: 'voter requerido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('reports')
      .insert({ submission_id: submissionId, reason: reason.trim(), voter });

    if (error) {
      // Distinguir errores típicos
      // 23505 = unique_violation (ya reportó esta publicación)
      if ((error as any)?.code === '23505') {
        return NextResponse.json(
          { ok: false, error: 'Ya reportaste esta publicación.' },
          { status: 409 }
        );
      }
      // P0001 con mensaje 'rate_limited' desde nuestro trigger
      if ((error as any)?.code === 'P0001' && /rate_limited/i.test(error.message)) {
        return NextResponse.json(
          { ok: false, error: 'Has alcanzado el límite de reportes por hora. Intenta más tarde.' },
          { status: 429 }
        );
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}

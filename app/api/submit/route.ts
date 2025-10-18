import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanitizeInput } from '@/app/lib/filters';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { title, content, category } = await req.json();

    const bl = (process.env.BLOCKLIST || '').split(',');
    for (const field of [title, content]) {
      const check = sanitizeInput(field, bl);
      if (!check.ok) {
        return NextResponse.json({ ok: false, error: check.msg }, { status: 400 });
      }
    }

    if (!['RUMOR', 'REPORTE'].includes(category)) {
      return NextResponse.json({ ok: false, error: 'Categoría inválida' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('submissions')
      .insert([{ title, content, category }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

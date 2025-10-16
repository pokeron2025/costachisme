import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-admin-key');
  if (key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id, action, reason } = await req.json();
  if (!['approve', 'reject', 'delete'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'Acción inválida' }, { status: 400 });
  }
  if (!id) return NextResponse.json({ ok: false, error: 'Falta id' }, { status: 400 });

  if (action === 'delete') {
    const { error } = await serviceClient.from('submissions').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const status = action === 'approve' ? 'approved' : 'rejected';
  const { error } = await serviceClient
    .from('submissions')
    .update({ status, rejection_reason: reason || null })
    .eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

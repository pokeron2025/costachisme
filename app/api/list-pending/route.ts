import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-admin-key');
  if (key !== process.env.ADMIN_KEY) return NextResponse.json({ ok:false, error:'Unauthorized' }, { status: 401 });

  const { data, error } = await serviceClient
    .from('submissions')
    .select('*')
    .eq('status','pending')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok:true, data });
}

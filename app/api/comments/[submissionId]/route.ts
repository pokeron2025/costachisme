// app/api/comments/[submissionId]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Evita caching en Vercel para este endpoint
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET: lista comentarios de una publicación (submissionId)
// Admite ?limit=50 (default 50, tope 100)
export async function GET(
  req: Request,
  { params }: { params: { submissionId: string } }
) {
  try {
    const submissionId = params?.submissionId;
    if (!submissionId) {
      return NextResponse.json(
        { ok: false, error: 'Falta submissionId en la ruta.' },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const limit = Math.max(
      1,
      Math.min(100, Number.isFinite(Number(limitParam)) ? Number(limitParam) : 50)
    );

    const { data,

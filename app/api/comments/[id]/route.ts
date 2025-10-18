import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/comments/:id  -> lista comentarios por submission
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { data, error } = await supabase
    .from("comments")
    .select("id, body, nickname, created_at")
    .eq("submission_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}

// POST /api/comments/:id  -> agrega comentario
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { body, nickname } = await req.json();

  if (!body || String(body).trim().length < 3) {
    return NextResponse.json(
      { ok: false, error: "Comentario muy corto (min. 3)" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("comments").insert([
    {
      submission_id: id,
      body,
      nickname: nickname || null
    }
  ]);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
